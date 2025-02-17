import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const VIDEO_FORMATS = {
    mp4: { label: 'MP4 (H.264)', mime: 'video/mp4' },
    avi: { label: 'AVI', mime: 'video/x-msvideo' },
    mov: { label: 'QuickTime MOV', mime: 'video/quicktime' }
};

function VideoEditor() {
    const [file, setFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentJobId, setCurrentJobId] = useState(null);
    const [progress, setProgress] = useState(0);
    const [healthInfo, setHealthInfo] = useState(null);
    const [error, setError] = useState(null);
    const [previewFrame, setPreviewFrame] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Video editing states
    const [editingParams, setEditingParams] = useState({
        action: 'trim',
        startTime: 0,
        endTime: 0,
        brightness_factor: 1.0,
        gamma: 1.0,
        preserve_colors: false,
        speed_factor: 1.0,
        speed_interpolation: 'linear',
        overlay_text: '',
        text_position: 'center',
        font_scale: 1.0,
        text_color: '255,255,255',
        text_thickness: 2,
        effect_intensity: 1.0,
        blur_intensity: 1.0,
        width: null,
        height: null,
        crop_x: 0,
        crop_y: 0,
        crop_width: null,
        crop_height: null,
        output_format: 'mp4'
    });

    useEffect(() => {
        // Health check polling
        const healthPoll = setInterval(async () => {
            try {
                const response = await axios.get(`${API_URL}/health`);
                setHealthInfo(response.data);
                setCurrentTime(new Date());
            } catch (error) {
                console.error('Health check failed:', error);
            }
        }, 5000);

        return () => clearInterval(healthPoll);
    }, []);

    // Enhanced parameter controls with keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                handleSubmit(e);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile);
        setVideoUrl(URL.createObjectURL(selectedFile));
    };

    const updateParams = (key, value) => {
        setEditingParams(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a video file');
            return;
        }

        setIsLoading(true);
        setError(null);
        setProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        
        // Append all editing parameters
        Object.entries(editingParams).forEach(([key, value]) => {
            if (value !== null) {
                formData.append(key, value);
            }
        });

        try {
            const response = await axios.post(`${API_URL}/edit_video/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setCurrentJobId(response.data.job_id);
            pollProgress(response.data.job_id);
        } catch (error) {
            setError(error.response?.data?.detail || 'Error processing video');
            setIsLoading(false);
        }
    };

    const pollProgress = (jobId) => {
        const interval = setInterval(async () => {
            try {
                const response = await axios.get(`${API_URL}/job/${jobId}`);
                const { status, progress } = response.data;

                setProgress(progress || 0);

                if (status === 'completed') {
                    clearInterval(interval);
                    setIsLoading(false);
                    window.location.href = `${API_URL}/job/${jobId}/download`;
                } else if (status === 'failed') {
                    clearInterval(interval);
                    setIsLoading(false);
                    setError(response.data.error || 'Processing failed');
                }
            } catch (error) {
                console.error('Error polling progress:', error);
            }
        }, 1000);
    };

    const renderEffectControls = () => {
        switch (editingParams.action) {
            case 'brighten':
            case 'darken':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Brightness Factor</label>
                            <input
                                type="range"
                                min="0.1"
                                max="3.0"
                                step="0.1"
                                value={editingParams.brightness_factor}
                                onChange={(e) => updateParams('brightness_factor', e.target.value)}
                                className="w-full"
                            />
                            <span className="text-sm text-gray-400">{editingParams.brightness_factor}</span>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Gamma</label>
                            <input
                                type="range"
                                min="0.1"
                                max="2.0"
                                step="0.1"
                                value={editingParams.gamma}
                                onChange={(e) => updateParams('gamma', e.target.value)}
                                className="w-full"
                            />
                            <span className="text-sm text-gray-400">{editingParams.gamma}</span>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={editingParams.preserve_colors}
                                onChange={(e) => updateParams('preserve_colors', e.target.checked)}
                                className="mr-2"
                            />
                            <label className="text-sm text-gray-300">Preserve Colors</label>
                        </div>
                    </div>
                );

            case 'speed':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Speed Factor</label>
                            <input
                                type="range"
                                min="0.1"
                                max="4.0"
                                step="0.1"
                                value={editingParams.speed_factor}
                                onChange={(e) => updateParams('speed_factor', e.target.value)}
                                className="w-full"
                            />
                            <span className="text-sm text-gray-400">{editingParams.speed_factor}x</span>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Interpolation</label>
                            <select
                                value={editingParams.speed_interpolation}
                                onChange={(e) => updateParams('speed_interpolation', e.target.value)}
                                className="w-full bg-gray-700 text-white rounded-md p-2"
                            >
                                <option value="linear">Linear (Smooth)</option>
                                <option value="simple">Simple</option>
                            </select>
                        </div>
                    </div>
                );

            case 'overlay_text':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Text</label>
                            <input
                                type="text"
                                value={editingParams.overlay_text}
                                onChange={(e) => updateParams('overlay_text', e.target.value)}
                                className="w-full bg-gray-700 text-white rounded-md p-2"
                                placeholder="Enter text..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Position</label>
                            <select
                                value={editingParams.text_position}
                                onChange={(e) => updateParams('text_position', e.target.value)}
                                className="w-full bg-gray-700 text-white rounded-md p-2"
                            >
                                <option value="top">Top</option>
                                <option value="center">Center</option>
                                <option value="bottom">Bottom</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Scale</label>
                            <input
                                type="range"
                                min="0.5"
                                max="3.0"
                                step="0.1"
                                value={editingParams.font_scale}
                                onChange={(e) => updateParams('font_scale', e.target.value)}
                                className="w-full"
                            />
                        </div>
                    </div>
                );

            case 'trim':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Start Time (seconds)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={editingParams.startTime}
                                onChange={(e) => updateParams('startTime', e.target.value)}
                                className="w-full bg-gray-700 text-white rounded-md p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">End Time (seconds)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={editingParams.endTime}
                                onChange={(e) => updateParams('endTime', e.target.value)}
                                className="w-full bg-gray-700 text-white rounded-md p-2"
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Enhanced Health Monitor */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-xl backdrop-blur-lg">
                    <div className={`p-3 rounded-lg ${healthInfo?.memory_usage > 80 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                        <div className="text-sm text-gray-300">Memory</div>
                        <div className="text-xl font-bold text-white">
                            {healthInfo?.memory_usage?.toFixed(1)}%
                        </div>
                    </div>
                    <div className={`p-3 rounded-lg ${healthInfo?.cpu_usage > 80 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                        <div className="text-sm text-gray-300">CPU</div>
                        <div className="text-xl font-bold text-white">
                            {healthInfo?.cpu_usage?.toFixed(1)}%
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/20">
                        <div className="text-sm text-gray-300">Active Jobs</div>
                        <div className="text-xl font-bold text-white">
                            {healthInfo?.active_jobs || 0}
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/20">
                        <div className="text-sm text-gray-300">Current Time</div>
                        <div className="text-xl font-bold text-white">
                            {currentTime.toLocaleTimeString()}
                        </div>
                    </div>
                </div>

                {/* Main Editing Interface */}
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
                    {/* Video Preview Section */}
                    <div className="space-y-4">
                        <div className="group relative aspect-video bg-gray-800 rounded-2xl overflow-hidden border-2 border-white/10 hover:border-blue-500/50 transition-all">
                            {videoUrl ? (
                                <video src={videoUrl} controls className="w-full h-full object-contain" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-gray-400">Upload a video to begin editing</span>
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="video-input"
                                />
                                <label
                                    htmlFor="video-input"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                                >
                                    {file ? 'Change Video' : 'Select Video'}
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Controls Panel */}
                    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                        <div className="flex gap-2 mb-6">
                            {['Basic', 'Advanced', 'Output'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab.toLowerCase())}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        activeTab === tab.toLowerCase() 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'basic' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Effect</label>
                                    <select
                                        value={editingParams.action}
                                        onChange={(e) => updateParams('action', e.target.value)}
                                        className="w-full bg-gray-700 text-white rounded-md p-2"
                                    >
                                        <option value="trim">Trim</option>
                                        <option value="brighten">Brighten</option>
                                        <option value="darken">Darken</option>
                                        <option value="speed">Speed Adjustment</option>
                                        <option value="reverse">Reverse</option>
                                        <option value="overlay_text">Add Text</option>
                                        <option value="sepia">Sepia</option>
                                        <option value="cool">Cool Tone</option>
                                        <option value="warm">Warm Tone</option>
                                        <option value="grayscale">Grayscale</option>
                                        <option value="negative">Negative</option>
                                        <option value="gaussian_blur">Gaussian Blur</option>
                                        <option value="motion_blur">Motion Blur</option>
                                        <option value="radial_blur">Radial Blur</option>
                                    </select>
                                </div>

                                {renderEffectControls()}
                            </div>
                        )}

                        {activeTab === 'output' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">Output Format</label>
                                    <select
                                        value={editingParams.output_format}
                                        onChange={(e) => updateParams('output_format', e.target.value)}
                                        className="w-full bg-gray-700 text-white rounded-md p-2"
                                    >
                                        {Object.entries(VIDEO_FORMATS).map(([format, { label }]) => (
                                            <option key={format} value={format}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300">Dimensions</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            type="number"
                                            placeholder="Width"
                                            value={editingParams.width || ''}
                                            onChange={(e) => updateParams('width', e.target.value)}
                                            className="bg-gray-700 text-white rounded-md p-2"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Height"
                                            value={editingParams.height || ''}
                                            onChange={(e) => updateParams('height', e.target.value)}
                                            className="bg-gray-700 text-white rounded-md p-2"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Leave empty to maintain original dimensions</p>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 bg-red-500/20 text-red-400 p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !file}
                            className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg py-3 px-4 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing... {progress}%
                                </div>
                            ) : (
                                'Process Video'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default VideoEditor;