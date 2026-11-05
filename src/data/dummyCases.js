// ANCHOR VI Project - ASEAN Traffic Accident Dataset
// Target: 400 Cases (200 Motorcycle-Car, 200 Car-Car across Indonesia, Malaysia, Thailand, Vietnam)
// 13 Crash Scenario Variables per case according to Research Proposal Page 9

export const INITIAL_SERVER_CONFIG = {
  hostname: '127.0.0.1',
  port: '8001',
  username: 'anchor_yolo_admin',
  password: '••••••••••••',
  gpuDevice: 'Nvidia GeForce RTX 4090 (24GB VRAM)',
  aiModel: 'YOLOv8x + DeepSORT v2.4 + TrajectoryNet',
  status: 'connected', // 'connected' | 'disconnected' | 'connecting'
  ping: 24,
  gpuUsage: 42,
  vramUsed: 14.8,
  vramTotal: 24.0,
  lastSync: '2026-09-03 14:30:12',
  autoClassify: true,
  fpsTarget: 30
};

export const CRASH_TYPES = {
  MOTORCYCLE_CAR: [
    'Rear Moving / Rear-End Conflict',
    'Turn Across Path – Oncoming',
    'Turn Across Path – Lateral',
    'Crossing (Perpendicular)',
    'Same Direction Turn'
  ],
  CAR_CAR: [
    'Rear-End Collision',
    'Crossing (Intersection T-Bone)',
    'Turning Collision / Side Impact',
    'Opposite Direction Collision (Head-On)'
  ]
};

export const ASEAN_NCAP_PROTOCOLS = [
  { code: 'AEB-MC', name: 'Autonomous Emergency Braking Motorcycle', focus: 'Detects oncoming & crossing motorcycles in urban traffic' },
  { code: 'BST', name: 'Blind Spot Technology', focus: 'Detects lane filtering motorcyclists in vehicle blind spots' },
  { code: 'RCTA/B', name: 'Rear Cross Traffic Alert / Braking', focus: 'Prevents backing out collisions with perpendicular motorcycles' },
  { code: 'ARV', name: 'Active Rear Visibility', focus: 'Monitors rear-approaching high-speed two-wheelers' },
  { code: 'CCR', name: 'Car-to-Car Rear', focus: 'Evaluates rear impact mitigation under mixed traffic stop-and-go' },
  { code: 'CTR', name: 'Car-to-Car Turning', focus: 'Evaluates turning across path conflicts at urban junctions' }
];

export const INITIAL_DUMMY_CASES = [
  {
    id: 'CASE-ID-2026-001',
    title: 'Jl. Sudirman Padang Motorcycle TAP-Oncoming',
    location: 'Jl. Jend. Sudirman CCTV-04, Padang, West Sumatra',
    country: 'Indonesia',
    flag: '🇮🇩',
    date: '2026-08-14 11:25:10',
    roadUserPair: 'Motorcycle – Car',
    crashType: 'Turn Across Path – Oncoming',
    confidenceScore: 0.96,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80',
    // 13 Variables (Page 9 of PDF)
    variables: {
      // 1. Crash Configuration
      crashType: 'Turn Across Path – Oncoming',
      roadUserPair: 'Motorcycle – Car',
      vehicle1Maneuver: 'SUV executing right turn across oncoming traffic lane',
      vehicle2Maneuver: 'Motorcycle traveling straight through intersection at constant speed',
      
      // 2. Crash Dynamics
      vehicle1Speed: 28.5, // km/h
      vehicle2Speed: 58.4, // km/h
      relativeSpeed: 86.9, // km/h
      impactSpeed: 52.1, // km/h
      impactAngle: 72.5, // degrees
      evasiveAction: 'Motorcycle hard front-wheel braking (1.8s prior); Car no braking',
      
      // 3. Severity
      pointOfImpact: 'Front Left Fender & A-Pillar of Car',
      crashSeverity: 'Severe Injury',
      
      // 4. Environment
      weather: 'Clear / Daylight Asphalt (Dry)'
    },
    aseanNcapRelevance: ['AEB-MC', 'CTR'],
    speedProfile: [
      { time: '-4.0s', v1Speed: 35, v2Speed: 60 },
      { time: '-3.0s', v1Speed: 32, v2Speed: 60 },
      { time: '-2.0s', v1Speed: 29, v2Speed: 59 },
      { time: '-1.0s', v1Speed: 28, v2Speed: 48 },
      { time: '0.0s (Impact)', v1Speed: 28.5, v2Speed: 52.1 }
    ],
    aiLogs: [
      '[11:25:06.120] YOLOv8 detected: Vehicle 1 (Car, 0.98), Vehicle 2 (Motorcycle, 0.94)',
      '[11:25:07.450] DeepSORT assigned: Track-12 (Car), Track-15 (Motorcycle)',
      '[11:25:08.800] Trajectory overlap detected: Predicted crash point (X: 142m, Y: 88m)',
      '[11:25:09.910] Classifying: Turn Across Path – Oncoming (Confidence 96.4%)',
      '[11:25:10.000] 13 Parameters successfully extracted to ANCHOR VI DB.'
    ]
  },
  {
    id: 'CASE-MY-2026-002',
    title: 'Federal Highway KL Lane Filtering Rear Moving',
    location: 'Federal Highway KM 14.2, Kuala Lumpur',
    country: 'Malaysia',
    flag: '🇲🇾',
    date: '2026-08-18 17:40:22',
    roadUserPair: 'Motorcycle – Car',
    crashType: 'Rear Moving / Rear-End Conflict',
    confidenceScore: 0.94,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    variables: {
      crashType: 'Rear Moving / Rear-End Conflict',
      roadUserPair: 'Motorcycle – Car',
      vehicle1Maneuver: 'Sedan decelerating sharply in heavy traffic lane',
      vehicle2Maneuver: 'Motorcycle lane filtering between Lane 1 & 2',
      
      vehicle1Speed: 18.0,
      vehicle2Speed: 46.2,
      relativeSpeed: 28.2,
      impactSpeed: 34.0,
      impactAngle: 15.0,
      evasiveAction: 'Motorcycle emergency rear brake lockup (0.6s prior)',
      
      pointOfImpact: 'Rear Right Bumper & Trunk Lid',
      crashSeverity: 'Minor Injury',
      
      weather: 'Rainy / Heavy Rain Asphalt'
    },
    aseanNcapRelevance: ['BST', 'ARV'],
    speedProfile: [
      { time: '-4.0s', v1Speed: 40, v2Speed: 48 },
      { time: '-3.0s', v1Speed: 30, v2Speed: 47 },
      { time: '-2.0s', v1Speed: 22, v2Speed: 46 },
      { time: '-1.0s', v1Speed: 18, v2Speed: 40 },
      { time: '0.0s (Impact)', v1Speed: 18.0, v2Speed: 34.0 }
    ],
    aiLogs: [
      '[17:40:18.010] YOLOv8 detected: Sedan (0.97), Scooter (0.91)',
      '[17:40:19.300] High optical flow density detected on wet surface',
      '[17:40:21.100] Trajectory collision angle: 15 deg (Rear Moving Conflict)',
      '[17:40:22.000] Scenario saved to ASEAN NCAP BST Database.'
    ]
  },
  {
    id: 'CASE-ID-2026-003',
    title: 'Intersection Simpang Haru padang TAP-Lateral',
    location: 'Simpang Haru Signalized Junction, Padang',
    country: 'Indonesia',
    flag: '🇮🇩',
    date: '2026-08-20 08:15:33',
    roadUserPair: 'Motorcycle – Car',
    crashType: 'Turn Across Path – Lateral',
    confidenceScore: 0.98,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
    variables: {
      crashType: 'Turn Across Path – Lateral',
      roadUserPair: 'Motorcycle – Car',
      vehicle1Maneuver: 'Pickup truck turning left from rightmost lane',
      vehicle2Maneuver: 'Underbone motorcycle proceeding straight on inner left side',
      
      vehicle1Speed: 22.0,
      vehicle2Speed: 42.0,
      relativeSpeed: 47.3,
      impactSpeed: 38.5,
      impactAngle: 65.0,
      evasiveAction: 'Car sudden steering wheel lock right (0.4s); Motorcycle swerve',
      
      pointOfImpact: 'Front Passenger Door of Pickup',
      crashSeverity: 'Severe Injury',
      
      weather: 'Clear / Morning Sun'
    },
    aseanNcapRelevance: ['BST', 'AEB-MC'],
    speedProfile: [
      { time: '-4.0s', v1Speed: 35, v2Speed: 45 },
      { time: '-3.0s', v1Speed: 30, v2Speed: 44 },
      { time: '-2.0s', v1Speed: 26, v2Speed: 43 },
      { time: '-1.0s', v1Speed: 22, v2Speed: 41 },
      { time: '0.0s (Impact)', v1Speed: 22.0, v2Speed: 38.5 }
    ],
    aiLogs: [
      '[08:15:30.000] Track ID #82 (Pickup Truck), Track ID #89 (Motorcycle)',
      '[08:15:31.500] Critical proximity alert: Lateral turn envelope intersected',
      '[08:15:33.000] Automated classification: Turn Across Path – Lateral (98% match)'
    ]
  },
  {
    id: 'CASE-MY-2026-004',
    title: 'Kuantan Junction Car-Car Side Impact T-Bone',
    location: 'Jalan Mahkota Intersection, Kuantan, Pahang',
    country: 'Malaysia',
    flag: '🇲🇾',
    date: '2026-08-22 22:04:19',
    roadUserPair: 'Car – Car',
    crashType: 'Turning Collision / Side Impact',
    confidenceScore: 0.95,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80',
    variables: {
      crashType: 'Turning Collision / Side Impact',
      roadUserPair: 'Car – Car',
      vehicle1Maneuver: 'Hatchback running amber/red signal at high speed',
      vehicle2Maneuver: 'MPV initiating right turn on green light',
      
      vehicle1Speed: 74.5,
      vehicle2Speed: 24.0,
      relativeSpeed: 78.3,
      impactSpeed: 68.2,
      impactAngle: 88.0,
      evasiveAction: 'MPV full brake locking (1.1s prior)',
      
      pointOfImpact: 'Center B-Pillar & Rear Left Door of MPV',
      crashSeverity: 'Fatal',
      
      weather: 'Night / Wet Streetlight'
    },
    aseanNcapRelevance: ['CTR', 'CCR'],
    speedProfile: [
      { time: '-4.0s', v1Speed: 76, v2Speed: 15 },
      { time: '-3.0s', v1Speed: 76, v2Speed: 20 },
      { time: '-2.0s', v1Speed: 75, v2Speed: 25 },
      { time: '-1.0s', v1Speed: 72, v2Speed: 18 },
      { time: '0.0s (Impact)', v1Speed: 68.2, v2Speed: 12.0 }
    ],
    aiLogs: [
      '[22:04:15.110] YOLOv8 Night Model active: Track-01 (Sedan), Track-04 (MPV)',
      '[22:04:17.800] High velocity delta detected across perpendicular vector',
      '[22:04:19.000] High-severity crash identified. Flagged for NCAP Protocol Review.'
    ]
  },
  {
    id: 'CASE-TH-2026-005',
    title: 'Bangkok Sukhumvit Perpendicular Crossing',
    location: 'Sukhumvit Soi 21 Junction, Bangkok',
    country: 'Thailand',
    flag: '🇹🇭',
    date: '2026-08-25 14:12:05',
    roadUserPair: 'Motorcycle – Car',
    crashType: 'Crossing (Perpendicular)',
    confidenceScore: 0.97,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
    variables: {
      crashType: 'Crossing (Perpendicular)',
      roadUserPair: 'Motorcycle – Car',
      vehicle1Maneuver: 'Taxi crossing unsignalized intersection',
      vehicle2Maneuver: 'Delivery motorcycle accelerating from blind alley',
      
      vehicle1Speed: 36.0,
      vehicle2Speed: 44.5,
      relativeSpeed: 57.2,
      impactSpeed: 41.0,
      impactAngle: 90.0,
      evasiveAction: 'Both vehicles attempted evasive steering simultaneously',
      
      pointOfImpact: 'Front Bumper of Taxi & Side Frame of Scooter',
      crashSeverity: 'Severe Injury',
      
      weather: 'Clear / Daylight'
    },
    aseanNcapRelevance: ['RCTA/B', 'AEB-MC'],
    speedProfile: [
      { time: '-4.0s', v1Speed: 38, v2Speed: 30 },
      { time: '-3.0s', v1Speed: 37, v2Speed: 38 },
      { time: '-2.0s', v1Speed: 37, v2Speed: 45 },
      { time: '-1.0s', v1Speed: 36, v2Speed: 44 },
      { time: '0.0s (Impact)', v1Speed: 34.0, v2Speed: 41.0 }
    ],
    aiLogs: [
      '[14:12:01.000] CCTV Feed Stream: 1080p @ 30 FPS',
      '[14:12:03.200] Trajectory model: Crossing path collision predicted (TTC = 1.2s)',
      '[14:12:05.000] Variables calculated and mapped to ASEAN NCAP RCTA/B standard.'
    ]
  },
  {
    id: 'CASE-VN-2026-006',
    title: 'Ho Chi Minh City Roundabout Same Direction Turn',
    location: 'District 1 Roundabout CCTV-02, Ho Chi Minh City',
    country: 'Vietnam',
    flag: '🇻🇳',
    date: '2026-08-28 09:50:44',
    roadUserPair: 'Motorcycle – Car',
    crashType: 'Same Direction Turn',
    confidenceScore: 0.92,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
    variables: {
      crashType: 'Same Direction Turn',
      roadUserPair: 'Motorcycle – Car',
      vehicle1Maneuver: 'Bus weaving outward at roundabout exit',
      vehicle2Maneuver: 'Commuter scooter making simultaneous wide arc turn',
      
      vehicle1Speed: 20.0,
      vehicle2Speed: 28.0,
      relativeSpeed: 12.5,
      impactSpeed: 22.0,
      impactAngle: 28.0,
      evasiveAction: 'Scooter rider foot drag & horn pulse',
      
      pointOfImpact: 'Rear Left Wheel Arch of Bus',
      crashSeverity: 'Property Damage Only',
      
      weather: 'Clear / Daylight'
    },
    aseanNcapRelevance: ['BST', 'AEB-MC'],
    speedProfile: [
      { time: '-4.0s', v1Speed: 24, v2Speed: 30 },
      { time: '-3.0s', v1Speed: 22, v2Speed: 29 },
      { time: '-2.0s', v1Speed: 21, v2Speed: 28 },
      { time: '-1.0s', v1Speed: 20, v2Speed: 26 },
      { time: '0.0s (Impact)', v1Speed: 19.5, v2Speed: 22.0 }
    ],
    aiLogs: [
      '[09:50:40.000] Multi-object trajectory density high (14 two-wheelers in frame)',
      '[09:50:42.100] DeepSORT tracking target #14 (Scooter) & target #02 (Bus)',
      '[09:50:44.000] Incident logged as Same Direction Turn conflict.'
    ]
  },
  {
    id: 'CASE-ID-2026-007',
    title: 'Bypass Khatib Sulaiman Head-On Collision',
    location: 'Bypass Khatib Sulaiman KM 6, Padang',
    country: 'Indonesia',
    flag: '🇮🇩',
    date: '2026-08-30 01:20:15',
    roadUserPair: 'Car – Car',
    crashType: 'Opposite Direction Collision (Head-On)',
    confidenceScore: 0.97,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80',
    variables: {
      crashType: 'Opposite Direction Collision (Head-On)',
      roadUserPair: 'Car – Car',
      vehicle1Maneuver: 'Sedan overtaking lorry in opposite traffic lane',
      vehicle2Maneuver: 'City car traveling legally in fast lane',
      
      vehicle1Speed: 82.0,
      vehicle2Speed: 65.0,
      relativeSpeed: 147.0,
      impactSpeed: 135.0,
      impactAngle: 175.0,
      evasiveAction: 'City car sudden right swerve; Sedan late brake',
      
      pointOfImpact: 'Full Frontal Overlap (80%)',
      crashSeverity: 'Fatal',
      
      weather: 'Night / Dark No Lights'
    },
    aseanNcapRelevance: ['CCR', 'AEB-MC'],
    speedProfile: [
      { time: '-4.0s', v1Speed: 85, v2Speed: 66 },
      { time: '-3.0s', v1Speed: 84, v2Speed: 66 },
      { time: '-2.0s', v1Speed: 84, v2Speed: 66 },
      { time: '-1.0s', v1Speed: 83, v2Speed: 64 },
      { time: '0.0s (Impact)', v1Speed: 82.0, v2Speed: 53.0 }
    ],
    aiLogs: [
      '[01:20:11.000] Low light enhancement filter applied',
      '[01:20:13.400] Opposite trajectory closing rate: 147 km/h',
      '[01:20:15.000] Severe frontal crash reconstructed.'
    ]
  }
];

export const RESEARCH_STATS = {
  totalTargetCases: 400,
  processedCases: 248,
  motorcycleCarCases: 135,
  carCarCases: 113,
  countriesCovered: [
    { country: 'Indonesia', cases: 112, flag: '🇮🇩' },
    { country: 'Malaysia', cases: 88, flag: '🇲🇾' },
    { country: 'Thailand', cases: 28, flag: '🇹🇭' },
    { country: 'Vietnam', cases: 20, flag: '🇻🇳' }
  ],
  scenarioCounts: {
    'Turn Across Path – Oncoming': 64,
    'Rear Moving / Rear-End Conflict': 58,
    'Turn Across Path – Lateral': 42,
    'Crossing (Perpendicular)': 38,
    'Same Direction Turn': 26,
    'Turning Collision / Side Impact': 20
  },
  projectLeader: 'Dr. Eng. Lusi Susanti',
  leadInstitution: 'Universitas Andalas',
  partnerInstitution: 'Universiti Malaysia Pahang Al-Sultan Abdullah',
  grantName: 'ANCHOR VI RESEARCH PROPOSAL (2026 - 2027)'
};
