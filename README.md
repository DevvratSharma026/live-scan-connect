# Live Detection Scanner

A real-time AI detection scanner with WebRTC camera access. Scan the QR code to start live object detection using your phone's camera.

## Features

- **QR Code Scanner**: Generate QR codes that link to the camera interface
- **WebRTC Camera Access**: Real-time video feed from device camera
- **Canvas Overlay**: Transparent overlay for drawing detection bounding boxes
- **Mobile-First Design**: Responsive layout optimized for mobile devices
- **Real-time Processing**: Processes video frames for AI inference

## Tech Stack

- React 18 with TypeScript
- Vite for development and building
- Tailwind CSS for styling
- React Router for navigation
- WebRTC API for camera access
- Canvas API for overlay graphics

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Usage

1. **Landing Page (`/`)**: Shows a QR code that links to the camera interface
2. **Camera Interface (`/webrtc`)**: Accesses device camera and displays live video with overlay

### Camera Features

- Environment camera (rear camera on mobile) preferred
- Real-time video processing at 10 FPS
- Canvas overlay for detection visualization
- Start/stop camera controls

## AI Inference Integration

> **Note**: AI inference will be added in a future update using `onnxruntime-web`

The app is prepared for AI model integration:

- `runInference(frame: ImageData)` function placeholder in `VideoFeed.tsx`
- `public/models/` folder for ONNX model files
- Canvas overlay system for drawing bounding boxes
- Frame processing pipeline at 10 FPS

### Planned Features

- ONNX model loading and inference
- Real-time object detection
- Bounding box visualization
- Detection confidence scores
- Multiple model support

## Project Structure

```
src/
├── components/
│   ├── QRCodeJoin.tsx      # QR code generation component
│   ├── VideoFeed.tsx       # WebRTC camera and canvas overlay
│   └── ui/                 # Shadcn UI components
├── pages/
│   ├── Index.tsx           # Landing page with QR code
│   ├── WebRTC.tsx          # Camera interface page
│   └── NotFound.tsx        # 404 page
└── styles/
    └── index.css           # Global styles and design tokens

public/
└── models/                 # ONNX model files (empty for now)
```

## Design System

The app uses a modern dark theme with tech-focused colors:

- **Primary**: Bright green (`#22c55e`) for accents and highlights
- **Background**: Dark slate for main background
- **Cards**: Slightly lighter dark slate with subtle borders
- **Gradients**: Tech-gradient from green to teal
- **Effects**: Glow effects and smooth transitions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on mobile devices
5. Submit a pull request

## License

This project is open source and available under the MIT License.