# VideoMaster 🎬✨

## Overview

VideoMaster is a powerful, modern web application for video editing that combines high performance with ease of use. Built with an optimized backend and responsive frontend, it handles video processing efficiently while providing real-time feedback and monitoring.

## 🌟 Features

### Video Processing
- **Multiple Format Support**: Export in MP4, AVI, and MOV formats
- **Video Effects**: 
  - Basic: Trim, Brighten, Darken
  - Speed: Adjust playback speed with interpolation options
  - Filters: Sepia, Cool Tone, Warm Tone, Grayscale, Negative
  - Blur Effects: Gaussian, Motion, Radial
- **Text Overlay**: Add custom text with position and styling options
- **Dimension Control**: Resize and crop videos
- **Batch Processing**: Efficient frame-by-frame processing

### Performance & Monitoring
- **Real-time Progress Tracking**: Monitor video processing progress
- **System Health Dashboard**: 
  - Memory usage monitoring
  - CPU utilization tracking
  - Active jobs counter
  - Current time display
- **Asynchronous Processing**: Background video processing with job management
- **Memory Optimization**: Efficient batch processing of frames

### User Interface
- **Modern Design**: Clean, intuitive interface with Tailwind CSS
- **Tabbed Controls**: Organized into Basic, Advanced, and Output settings
- **Real-time Feedback**: Processing status and progress indicators
- **Responsive Layout**: Adapts to different screen sizes
- **Keyboard Shortcuts**: Enhanced productivity with keyboard controls

## 🛠 Tech Stack

### Frontend
- React
- Tailwind CSS
- Axios for API communication
- Lucide React Icons

### Backend
- FastAPI
- OpenCV for video processing
- Python 3.9+
- Async processing with BackgroundTasks

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- Python (v3.9+)
- pip
- npm

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn main:app --reload
```

## 💡 Usage

1. **Upload Video**
   - Click the upload area or drag and drop your video file
   - Supported formats: MP4, AVI, MOV

2. **Choose Effect**
   - Select from various effects in the Basic tab
   - Configure advanced settings if needed
   - Set output format and dimensions in the Output tab

3. **Process Video**
   - Click "Process Video" to start
   - Monitor progress in real-time
   - Download processed video when complete

4. **System Monitoring**
   - Track system resources in the health dashboard
   - Monitor active jobs and processing status

## ⚡ Performance Features

### Batch Processing
- Processes video in batches of 30 frames
- Optimizes memory usage
- Immediate disk writing for processed frames

### Async Processing
- Non-blocking video processing
- Real-time progress tracking
- Job management system

### Memory Management
- Efficient frame batch processing
- Automatic memory cleanup
- Optimized resource utilization

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgements

- [React](https://reactjs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [OpenCV](https://opencv.org/)
- [Tailwind CSS](https://tailwindcss.com/)
