import type { Resource, Unit } from "./types";

export const campusZone = "Asia/Kolkata";
export const campusOffset = "+05:30";
export const campusId = (value: number) => `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

export const equipment: Resource[] = [
  {
    "id": "10000000-0000-4000-8000-000000000100",
    "name": "NVIDIA GPU Workstation",
    "category": "AI and Computing",
    "labId": "10000000-0000-4000-8000-000000000001",
    "department": "Computer Science",
    "lab": "Accelerated Computing Lab",
    "location": "Innovation Hall · 204",
    "manufacturer": "NVIDIA",
    "model": "RTX 4090",
    "specifications": "24 GB VRAM; CUDA; 64 GB RAM",
    "capabilities": [
      "gpu",
      "model-training",
      "computer-vision"
    ],
    "requiresApproval": true,
    "requiresTraining": false
  },
  {
    "id": "10000000-0000-4000-8000-000000000101",
    "name": "Raspberry Pi Development Kit",
    "category": "Electronics and IoT",
    "labId": "10000000-0000-4000-8000-000000000002",
    "department": "Electrical Engineering",
    "lab": "Circuits and Embedded Systems",
    "location": "Faraday Building · B12",
    "manufacturer": "Raspberry Pi",
    "model": "Pi 5",
    "specifications": "8 GB RAM; 40-pin GPIO; camera connector",
    "capabilities": [
      "single-board-computing",
      "gpio",
      "sensor-integration"
    ],
    "requiresApproval": false,
    "requiresTraining": false
  },
  {
    "id": "10000000-0000-4000-8000-000000000102",
    "name": "Raspberry Pi Development Kit",
    "category": "Robotics",
    "labId": "10000000-0000-4000-8000-000000000003",
    "department": "Mechatronics",
    "lab": "Autonomous Systems Lab",
    "location": "Innovation Hall · 118",
    "manufacturer": "Raspberry Pi",
    "model": "Pi 5",
    "specifications": "8 GB RAM; 40-pin GPIO; camera included",
    "capabilities": [
      "single-board-computing",
      "gpio",
      "sensor-integration"
    ],
    "requiresApproval": false,
    "requiresTraining": false
  },
  {
    "id": "10000000-0000-4000-8000-000000000103",
    "name": "Arduino Uno Kit",
    "category": "Electronics and IoT",
    "labId": "10000000-0000-4000-8000-000000000002",
    "department": "Electrical Engineering",
    "lab": "Circuits and Embedded Systems",
    "location": "Faraday Building · B12",
    "manufacturer": "Arduino",
    "model": "Uno R3",
    "specifications": "ATmega328P; 14 digital I/O; 6 analog inputs",
    "capabilities": [
      "microcontrollers",
      "gpio",
      "sensor-integration"
    ],
    "requiresApproval": false,
    "requiresTraining": false
  },
  {
    "id": "10000000-0000-4000-8000-000000000104",
    "name": "ESP32 Kit",
    "category": "Electronics and IoT",
    "labId": "10000000-0000-4000-8000-000000000002",
    "department": "Electrical Engineering",
    "lab": "Circuits and Embedded Systems",
    "location": "Faraday Building · B12",
    "manufacturer": "Espressif",
    "model": "ESP32-S3",
    "specifications": "2.4 GHz Wi-Fi; BLE; USB-C",
    "capabilities": [
      "microcontrollers",
      "wireless",
      "sensor-integration"
    ],
    "requiresApproval": false,
    "requiresTraining": false
  },
  {
    "id": "10000000-0000-4000-8000-000000000105",
    "name": "Jetson Nano",
    "category": "Robotics",
    "labId": "10000000-0000-4000-8000-000000000003",
    "department": "Mechatronics",
    "lab": "Autonomous Systems Lab",
    "location": "Innovation Hall · 118",
    "manufacturer": "NVIDIA",
    "model": "Jetson Nano 4 GB",
    "specifications": "128-core Maxwell GPU; CSI camera",
    "capabilities": [
      "edge-inference",
      "computer-vision",
      "single-board-computing"
    ],
    "requiresApproval": false,
    "requiresTraining": false
  },
  {
    "id": "10000000-0000-4000-8000-000000000106",
    "name": "Digital Oscilloscope",
    "category": "Testing and Measurement",
    "labId": "10000000-0000-4000-8000-000000000002",
    "department": "Electrical Engineering",
    "lab": "Circuits and Embedded Systems",
    "location": "Faraday Building · B12",
    "manufacturer": "Rigol",
    "model": "DS1054Z",
    "specifications": "50 MHz; four analog channels",
    "capabilities": [
      "signal-measurement",
      "circuit-debugging"
    ],
    "requiresApproval": false,
    "requiresTraining": false
  },
  {
    "id": "10000000-0000-4000-8000-000000000107",
    "name": "Logic Analyzer",
    "category": "Testing and Measurement",
    "labId": "10000000-0000-4000-8000-000000000002",
    "department": "Electrical Engineering",
    "lab": "Circuits and Embedded Systems",
    "location": "Faraday Building · B12",
    "manufacturer": "Saleae",
    "model": "Logic 8",
    "specifications": "Eight channels; USB; protocol decoding",
    "capabilities": [
      "digital-debugging",
      "circuit-debugging"
    ],
    "requiresApproval": false,
    "requiresTraining": false
  },
  {
    "id": "10000000-0000-4000-8000-000000000108",
    "name": "FDM 3D Printer",
    "category": "Mechanical and Prototyping",
    "labId": "10000000-0000-4000-8000-000000000004",
    "department": "Mechanical Engineering",
    "lab": "Digital Fabrication Studio",
    "location": "Engineering Annex · 107",
    "manufacturer": "Prusa",
    "model": "MK4S",
    "specifications": "250 × 210 × 220 mm; PLA and PETG",
    "capabilities": [
      "3d-printing",
      "prototyping"
    ],
    "requiresApproval": true,
    "requiresTraining": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000109",
    "name": "Robotics Workstation",
    "category": "Robotics",
    "labId": "10000000-0000-4000-8000-000000000003",
    "department": "Mechatronics",
    "lab": "Autonomous Systems Lab",
    "location": "Innovation Hall · 118",
    "manufacturer": "ROBOTIS",
    "model": "TurtleBot3 Burger",
    "specifications": "ROS 2; 2D LiDAR; differential drive",
    "capabilities": [
      "robotics",
      "navigation",
      "sensor-integration"
    ],
    "requiresApproval": true,
    "requiresTraining": false
  },
  {
    "id": "10000000-0000-4000-8000-000000000110",
    "name": "Soldering Station",
    "category": "Mechanical and Prototyping",
    "labId": "10000000-0000-4000-8000-000000000002",
    "department": "Electrical Engineering",
    "lab": "Circuits and Embedded Systems",
    "location": "Faraday Building · B12",
    "manufacturer": "Hakko",
    "model": "FX-888DX",
    "specifications": "Temperature-controlled iron; fume extraction",
    "capabilities": [
      "soldering",
      "prototyping"
    ],
    "requiresApproval": false,
    "requiresTraining": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000111",
    "name": "Electronics Testing Bench",
    "category": "Testing and Measurement",
    "labId": "10000000-0000-4000-8000-000000000002",
    "department": "Electrical Engineering",
    "lab": "Circuits and Embedded Systems",
    "location": "Faraday Building · B12",
    "manufacturer": "Keysight",
    "model": "EDU Bench",
    "specifications": "DC supply; multimeter; waveform generator",
    "capabilities": [
      "signal-measurement",
      "circuit-debugging"
    ],
    "requiresApproval": false,
    "requiresTraining": false
  },
  {
    "id": "10000000-0000-4000-8000-000000000112",
    "name": "Computer Vision Workstation",
    "category": "Research Workstations",
    "labId": "10000000-0000-4000-8000-000000000003",
    "department": "Mechatronics",
    "lab": "Autonomous Systems Lab",
    "location": "Innovation Hall · 118",
    "manufacturer": "NVIDIA",
    "model": "RTX A5000",
    "specifications": "24 GB VRAM; CUDA; 64 GB RAM",
    "capabilities": [
      "gpu",
      "model-training",
      "computer-vision"
    ],
    "requiresApproval": true,
    "requiresTraining": false
  },
  {
    "id": "10000000-0000-4000-8000-000000000113",
    "name": "Sensor Development Kit",
    "category": "Electronics and IoT",
    "labId": "10000000-0000-4000-8000-000000000002",
    "department": "Electrical Engineering",
    "lab": "Circuits and Embedded Systems",
    "location": "Faraday Building · B12",
    "manufacturer": "Adafruit",
    "model": "STEMMA QT",
    "specifications": "IMU, distance and environmental sensors",
    "capabilities": [
      "sensor-integration",
      "gpio"
    ],
    "requiresApproval": false,
    "requiresTraining": false
  },
  {
    "id": "10000000-0000-4000-8000-000000000114",
    "name": "CNC Workstation",
    "category": "Mechanical and Prototyping",
    "labId": "10000000-0000-4000-8000-000000000004",
    "department": "Mechanical Engineering",
    "lab": "Digital Fabrication Studio",
    "location": "Engineering Annex · 107",
    "manufacturer": "Carbide 3D",
    "model": "Shapeoko 5 Pro",
    "specifications": "3-axis router; wood, plastics and aluminum",
    "capabilities": [
      "cnc",
      "prototyping"
    ],
    "requiresApproval": true,
    "requiresTraining": true
  }
];

export const units: Unit[] = equipment.map((resource, index) => ({
  id: campusId(200 + index), equipmentId: resource.id, label: `${resource.model} · 01`,
  operational: true, opens: 9, closes: 17, days: [1, 2, 3, 4, 5],
}));
