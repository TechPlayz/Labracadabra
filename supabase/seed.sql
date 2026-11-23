-- Example inventory for a development database. Auth users and profiles are provisioned separately.
insert into departments(id,name,code) values
  ('10000000-0000-4000-8000-000000000010','Computer Science','CS'),
  ('10000000-0000-4000-8000-000000000011','Electrical Engineering','EE'),
  ('10000000-0000-4000-8000-000000000012','Mechatronics','MECH'),
  ('10000000-0000-4000-8000-000000000013','Mechanical Engineering','MEC')
on conflict (id) do nothing;

insert into laboratories(id,department_id,name,location) values
  ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000010','Accelerated Computing Lab','Innovation Hall · 204'),
  ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000011','Circuits and Embedded Systems','Faraday Building · B12'),
  ('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000012','Autonomous Systems Lab','Innovation Hall · 118'),
  ('10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000013','Digital Fabrication Studio','Engineering Annex · 107')
on conflict (id) do nothing;

insert into equipment(id,laboratory_id,name,category,manufacturer,model,specifications,capabilities,requires_approval,requires_training) values
  ('10000000-0000-4000-8000-000000000100','10000000-0000-4000-8000-000000000001','NVIDIA GPU Workstation','AI and Computing','NVIDIA','RTX 4090','24 GB VRAM; CUDA; 64 GB RAM',array['gpu','model-training','computer-vision'],true,false),
  ('10000000-0000-4000-8000-000000000101','10000000-0000-4000-8000-000000000002','Raspberry Pi Development Kit','Electronics and IoT','Raspberry Pi','Pi 5','8 GB RAM; 40-pin GPIO; camera connector',array['single-board-computing','gpio','sensor-integration'],false,false),
  ('10000000-0000-4000-8000-000000000102','10000000-0000-4000-8000-000000000003','Raspberry Pi Development Kit','Robotics','Raspberry Pi','Pi 5','8 GB RAM; 40-pin GPIO; camera included',array['single-board-computing','gpio','sensor-integration'],false,false),
  ('10000000-0000-4000-8000-000000000103','10000000-0000-4000-8000-000000000002','Arduino Uno Kit','Electronics and IoT','Arduino','Uno R3','ATmega328P; 14 digital I/O; 6 analog inputs',array['microcontrollers','gpio','sensor-integration'],false,false),
  ('10000000-0000-4000-8000-000000000104','10000000-0000-4000-8000-000000000002','ESP32 Kit','Electronics and IoT','Espressif','ESP32-S3','2.4 GHz Wi-Fi; BLE; USB-C',array['microcontrollers','wireless','sensor-integration'],false,false),
  ('10000000-0000-4000-8000-000000000105','10000000-0000-4000-8000-000000000003','Jetson Nano','Robotics','NVIDIA','Jetson Nano 4 GB','128-core Maxwell GPU; CSI camera',array['edge-inference','computer-vision','single-board-computing'],false,false),
  ('10000000-0000-4000-8000-000000000106','10000000-0000-4000-8000-000000000002','Digital Oscilloscope','Testing and Measurement','Rigol','DS1054Z','50 MHz; four analog channels',array['signal-measurement','circuit-debugging'],false,false),
  ('10000000-0000-4000-8000-000000000107','10000000-0000-4000-8000-000000000002','Logic Analyzer','Testing and Measurement','Saleae','Logic 8','Eight channels; USB; protocol decoding',array['digital-debugging','circuit-debugging'],false,false),
  ('10000000-0000-4000-8000-000000000108','10000000-0000-4000-8000-000000000004','FDM 3D Printer','Mechanical and Prototyping','Prusa','MK4S','250 × 210 × 220 mm; PLA and PETG',array['3d-printing','prototyping'],true,true),
  ('10000000-0000-4000-8000-000000000109','10000000-0000-4000-8000-000000000003','Robotics Workstation','Robotics','ROBOTIS','TurtleBot3 Burger','ROS 2; 2D LiDAR; differential drive',array['robotics','navigation','sensor-integration'],true,false),
  ('10000000-0000-4000-8000-000000000110','10000000-0000-4000-8000-000000000002','Soldering Station','Mechanical and Prototyping','Hakko','FX-888DX','Temperature-controlled iron; fume extraction',array['soldering','prototyping'],false,true),
  ('10000000-0000-4000-8000-000000000111','10000000-0000-4000-8000-000000000002','Electronics Testing Bench','Testing and Measurement','Keysight','EDU Bench','DC supply; multimeter; waveform generator',array['signal-measurement','circuit-debugging'],false,false),
  ('10000000-0000-4000-8000-000000000112','10000000-0000-4000-8000-000000000003','Computer Vision Workstation','Research Workstations','NVIDIA','RTX A5000','24 GB VRAM; CUDA; 64 GB RAM',array['gpu','model-training','computer-vision'],true,false),
  ('10000000-0000-4000-8000-000000000113','10000000-0000-4000-8000-000000000002','Sensor Development Kit','Electronics and IoT','Adafruit','STEMMA QT','IMU, distance and environmental sensors',array['sensor-integration','gpio'],false,false),
  ('10000000-0000-4000-8000-000000000114','10000000-0000-4000-8000-000000000004','CNC Workstation','Mechanical and Prototyping','Carbide 3D','Shapeoko 5 Pro','3-axis router; wood, plastics and aluminum',array['cnc','prototyping'],true,true)
on conflict (id) do nothing;

insert into equipment_units(id,equipment_id,label) values
  ('10000000-0000-4000-8000-000000000200','10000000-0000-4000-8000-000000000100','RTX 4090 · 01'),
  ('10000000-0000-4000-8000-000000000201','10000000-0000-4000-8000-000000000101','Pi 5 · 01'),
  ('10000000-0000-4000-8000-000000000202','10000000-0000-4000-8000-000000000102','Pi 5 · 01'),
  ('10000000-0000-4000-8000-000000000203','10000000-0000-4000-8000-000000000103','Uno R3 · 01'),
  ('10000000-0000-4000-8000-000000000204','10000000-0000-4000-8000-000000000104','ESP32-S3 · 01'),
  ('10000000-0000-4000-8000-000000000205','10000000-0000-4000-8000-000000000105','Jetson Nano 4 GB · 01'),
  ('10000000-0000-4000-8000-000000000206','10000000-0000-4000-8000-000000000106','DS1054Z · 01'),
  ('10000000-0000-4000-8000-000000000207','10000000-0000-4000-8000-000000000107','Logic 8 · 01'),
  ('10000000-0000-4000-8000-000000000208','10000000-0000-4000-8000-000000000108','MK4S · 01'),
  ('10000000-0000-4000-8000-000000000209','10000000-0000-4000-8000-000000000109','TurtleBot3 Burger · 01'),
  ('10000000-0000-4000-8000-000000000210','10000000-0000-4000-8000-000000000110','FX-888DX · 01'),
  ('10000000-0000-4000-8000-000000000211','10000000-0000-4000-8000-000000000111','EDU Bench · 01'),
  ('10000000-0000-4000-8000-000000000212','10000000-0000-4000-8000-000000000112','RTX A5000 · 01'),
  ('10000000-0000-4000-8000-000000000213','10000000-0000-4000-8000-000000000113','STEMMA QT · 01'),
  ('10000000-0000-4000-8000-000000000214','10000000-0000-4000-8000-000000000114','Shapeoko 5 Pro · 01')
on conflict (id) do nothing;
