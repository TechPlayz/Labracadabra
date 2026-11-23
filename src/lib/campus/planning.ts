import type { Resource } from "./types";
import { compatibleResources } from "./scheduling";

export const examplePrompts = [
  "Build an autonomous delivery robot that navigates with cameras and sensors",
  "Make a Wi-Fi air-quality monitor and test its sensor readings",
  "Train a computer vision model for campus traffic counting",
  "3D-print a prototype enclosure and measure the control circuit",
];

const rulebook: [RegExp, string[]][] = [
  [/robot|ros\s?2|autonomous|navigation/i, ["navigation", "robotics", "sensor-integration", "edge-inference", "3d-printing"]],
  [/camera|computer vision|object detect|traffic count/i, ["computer-vision", "edge-inference"]],
  [/gpu|train.*model|pytorch|cuda|machine learning/i, ["gpu", "model-training"]],
  [/iot|wi-fi|wifi|wireless|air.quality/i, ["microcontrollers", "wireless", "sensor-integration"]],
  [/raspberry|gpio|\bpi\s?5\b/i, ["single-board-computing", "gpio"]],
  [/circuit|signal|oscilloscope|voltage|electronics/i, ["signal-measurement", "circuit-debugging"]],
  [/3d.print|enclosure|fabricat|prototype/i, ["3d-printing", "prototyping"]],
  [/solder|pcb/i, ["soldering"]],
  [/cnc|mill|machine part/i, ["cnc"]],
  [/sensor|imu|lidar/i, ["sensor-integration"]],
];

export function ruleCapabilities(prompt: string, known: Set<string>) {
  return [...new Set(rulebook.flatMap(([pattern, capabilities]) => pattern.test(prompt) ? capabilities : []))]
    .filter((capability) => known.has(capability));
}

const guidance: Record<string, [string, string]> = {
  robotics: ["Integration", "Run the mobility stack and validate robot behavior."],
  navigation: ["Integration", "Test mapping and waypoint navigation."],
  "sensor-integration": ["Prototype", "Connect and verify the project’s sensors."],
  "edge-inference": ["Integration", "Run inference on embedded hardware."],
  "single-board-computing": ["Prototype", "Use an embedded Linux board for early integration."],
  gpu: ["Validation", "Run GPU-accelerated workloads."],
  "model-training": ["Validation", "Train and compare project models."],
  "computer-vision": ["Validation", "Evaluate camera processing and recognition."],
  "3d-printing": ["Fabrication", "Print prototype mounts and enclosures."],
  microcontrollers: ["Prototype", "Build and test the controller firmware."],
  wireless: ["Integration", "Test wireless connectivity with the controller."],
  "signal-measurement": ["Validation", "Measure electrical signals during testing."],
  "circuit-debugging": ["Validation", "Diagnose issues in the prototype circuit."],
  soldering: ["Fabrication", "Assemble or rework the circuit connections."],
  cnc: ["Fabrication", "Machine prototype components."],
};

export interface Plan {
  source: "Gemini" | "Catalog rules";
  capabilities: string[];
  recommendations: { equipmentId: string; capabilities: string[]; stage: string; rationale: string; alternatives: string[] }[];
}

export function buildPlan(prompt: string, catalog: Resource[], modelCapabilities?: string[]): Plan {
  const known = new Set(catalog.flatMap((resource) => resource.capabilities));
  const capabilities = modelCapabilities?.filter((capability) => known.has(capability)) ?? ruleCapabilities(prompt, known);
  const required = [...new Set(capabilities)];
  const rank = (resource: Resource) => required.filter((capability) => resource.capabilities.includes(capability));
  const remaining = new Set(required);
  const matches = catalog.map((resource) => ({ resource, coverage: rank(resource) }))
    .filter((item) => item.coverage.length)
    .sort((first, second) => second.coverage.length - first.coverage.length || first.resource.name.localeCompare(second.resource.name) || first.resource.id.localeCompare(second.resource.id));
  const recommendations: Plan["recommendations"] = [];

  for (const { resource, coverage } of matches) {
    const target = coverage.find((capability) => remaining.has(capability));
    if (!target) continue;
    const [stage, rationale] = guidance[target] ?? ["Prototype", `Use the catalog’s ${target.replaceAll("-", " ")} capability.`];
    recommendations.push({ equipmentId: resource.id, capabilities: coverage, stage, rationale,
      alternatives: compatibleResources(resource, catalog, { capabilities: coverage })
        .slice(0, 3).map((item) => item.id) });
    coverage.forEach((capability) => remaining.delete(capability));
    if (recommendations.length >= 6) break;
  }
  return { source: modelCapabilities ? "Gemini" : "Catalog rules", capabilities: required, recommendations };
}
