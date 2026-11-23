import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const [base = "http://127.0.0.1:3077", debug = "http://127.0.0.1:9229", artifacts] = process.argv.slice(2);
const tabs = await (await fetch(`${debug}/json/list`)).json();
const tab = tabs.find((item) => item.type === "page");
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let next = 0;
const pending = new Map();
const errors = [];
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
});

function cdp(method, params = {}) {
  const id = ++next;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const reply = await cdp("Runtime.evaluate", { expression, returnByValue: true });
  if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description);
  return reply.result.value;
}

async function wait(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(expression).catch(() => false)) return;
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

const exists = (text) => `document.body?.innerText.includes(${JSON.stringify(text)})`;
const button = (text) => `[...document.querySelectorAll('button')].find(e => e.textContent.trim() === ${JSON.stringify(text)})`;
const viewport = (width, height, mobile) => cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
const navigate = (path) => cdp("Page.navigate", { url: `${base}${path}` });
async function screenshot(name) {
  if (!artifacts) return;
  const capture = await cdp("Page.captureScreenshot", { format: "png" });
  await writeFile(join(artifacts, name), Buffer.from(capture.data, "base64"));
}

try {
  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await viewport(1440, 1000, false);
  await navigate("/");
  await wait(exists("Your Lab Wishes, Granted."));
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  assert.ok(await evaluate("getComputedStyle(document.querySelector('aside')).display === 'flex'"));
  await screenshot("labracadabra-desktop.png");

  await viewport(390, 844, true);
  await wait("innerWidth === 390");
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  const menu = "document.querySelector('button[aria-label=\"Open navigation menu\"]')";
  await evaluate(`${menu}.focus(); ${menu}.click()`);
  await wait("document.querySelector('dialog[aria-label=\"Campus navigation\"]').open");
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await wait("!document.querySelector('dialog[aria-label=\"Campus navigation\"]').open");
  assert.equal(await evaluate(`document.activeElement === ${menu}`), true);

  await navigate("/equipment?q=Raspberry%20Pi");
  await wait(exists("2 resources"));
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  assert.ok(await evaluate(exists("Mechatronics")));
  assert.ok(await evaluate(exists("Electrical Engineering")));
  await screenshot("labracadabra-mobile.png");
  await evaluate("document.querySelector('main a[href^=\"/equipment/\"]').click()");
  await wait(exists("Availability and booking"));
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);

  await navigate("/assistant?prompt=Build%20an%20autonomous%20delivery%20robot");
  await wait(exists("Wish-to-Workspace"));
  await evaluate(`${button("Build resource plan")}.click()`);
  await wait(exists("Project resource plan"));
  assert.ok(await evaluate(exists("Robotics Workstation")));

  await navigate("/projects");
  await wait(exists("Project workspace"));
  await evaluate(`${button("New project")}.click()`);
  await wait("!!document.querySelector('dialog[open] input[name=title]')");
  await evaluate(`(() => {
    const root = document.querySelector('dialog[open]');
    root.querySelector('[name=title]').value = 'Browser verification project';
    root.querySelector('[name=description]').value = 'Build a small engineering prototype in the campus lab.';
    root.querySelector('[name=deadline]').value = '2099-11-23';
    root.querySelector('form').requestSubmit();
  })()`);
  await wait(exists("Browser verification project"));
  await wait(exists("Required equipment"));

  await navigate("/bookings");
  await wait(exists("My bookings"));
  await wait(`!!${button("Show booking QR")}`);
  await evaluate(`${button("Show booking QR")}.click()`);
  await wait("!!document.querySelector('dialog[open] svg[aria-label=\"Booking check-in QR code\"]')");
  await evaluate("document.querySelector('dialog[open] button[aria-label=\"Close dialog\"]').click()");

  await viewport(1440, 1000, false);
  await navigate("/faculty");
  await wait(exists("Faculty access required"));
  await evaluate(`(() => {
    const select = document.querySelector('#demo-persona');
    select.value = [...select.options].find(o => o.text.includes('Nila Rao')).value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await wait(exists("Faculty approval center"));
  await navigate("/conflicts");
  await wait(exists("Suggested allocation"));
  assert.ok(await evaluate(exists("Availability timeline")));
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  assert.deepEqual(errors, []);
  console.log("Passed desktop and mobile layouts, keyboard drawer close and focus restoration, discovery, equipment navigation, Copilot, project creation, booking QR display, scoped faculty UI, and FairShare rendering.");
} finally { socket.close(); }
