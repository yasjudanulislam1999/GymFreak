import React, { useState, useRef, useEffect } from 'react';
import { Camera, X } from 'lucide-react';

interface CameraCaptureProps {
  onImageCapture: (imageData: string) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCapture, onClose }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera when component mounts
  useEffect(() => {
    startCamera();
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isLoading && !stream) {
        console.log('⏰ Camera loading timeout');
        setError('Camera is taking too long to load. Please try again or use text input instead.');
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout
    
    return () => {
      clearTimeout(timeout);
      stopCamera();
    };
  }, []);

  // Handle video element setup when stream is available
  useEffect(() => {
    if (stream && videoRef.current) {
      console.log('📹 Setting up video element...', {
        stream: !!stream,
        videoElement: !!videoRef.current,
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight
      });
      
      const video = videoRef.current;
      
      // Set video properties
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      
      // Set the stream
      video.srcObject = stream;
      
      // Add event listeners for debugging
      video.addEventListener('loadedmetadata', () => {
        console.log('📹 Video metadata loaded', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
      });
      
      video.addEventListener('canplay', () => {
        console.log('📹 Video can play');
      });
      
      video.addEventListener('error', (e) => {
        console.error('❌ Video error event:', e);
        setError('Video failed to load. Please try again.');
      });
      
      // Play the video
      video.play().then(() => {
        console.log('✅ Video started playing');
      }).catch(err => {
        console.error('❌ Video play error:', err);
        setError('Failed to start video. Please try again.');
      });
    } else if (stream && !videoRef.current) {
      console.log('⚠️ Stream available but video element not ready yet');
    }
  }, [stream]);

  const startCamera = async () => {
    try {
      console.log('🎥 Starting camera...');
      setIsLoading(true);
      setError(null);

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Request camera access with fallback constraints
      let mediaStream;
      try {
        // Try back camera first
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (backCameraError) {
        console.log('🔄 Back camera failed, trying front camera...');
        // Fallback to front camera
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      }

      console.log('✅ Camera stream obtained', {
        stream: !!mediaStream,
        tracks: mediaStream.getTracks().length,
        videoTrack: mediaStream.getVideoTracks()[0]?.label
      });
      
      setStream(mediaStream);
      setIsLoading(false); // Stop loading immediately when stream is obtained

    } catch (err: any) {
      console.error('❌ Camera error:', err);
      let errorMessage = 'Camera access denied or not available. Please use text input instead.';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device. Please use text input instead.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported on this device. Please use text input instead.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64 image
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        console.log('📸 Image captured');
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmImage = () => {
    if (capturedImage) {
      onImageCapture(capturedImage);
      onClose();
    }
  };

  const cancelCapture = () => {
    stopCamera();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        animation: 'slideDown 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Food Camera</h3>
          </div>
          <button
            onClick={cancelCapture}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* Camera Content */}
        <div style={{ marginBottom: '20px' }}>
          {error ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              textAlign: 'center',
              padding: '20px'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
              </div>
              <h4 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Camera Error</h4>
              <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '14px' }}>{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  startCamera();
                }}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '8px'
                }}
              >
                🔄 Try Again
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                📝 Use Text Input Instead
              </button>
            </div>
          ) : capturedImage ? (
            <div style={{ textAlign: 'center' }}>
              <img
                src={capturedImage}
                alt="Captured food"
                style={{
                  width: '100%',
                  maxHeight: '300px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={retakePhoto}
                  style={{
                    background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  📷 Retake
                </button>
                <button
                  onClick={confirmImage}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ✅ Use This Photo
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }}></div>
              <p style={{ margin: '0', fontSize: '16px', color: '#374151' }}>Starting camera...</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                Please allow camera access when prompted
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  maxHeight: '300px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  backgroundColor: '#000'
                }}
              />
              <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                Point your camera at food and click to capture
              </p>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                Debug: Stream={stream ? '✅' : '❌'} Video={videoRef.current ? '✅' : '❌'}
              </div>
              <button
                onClick={captureImage}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '25px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '16px',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                📸 Capture Food
              </button>
            </div>
          )}
        </div>

        {/* Hidden canvas for image capture */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CameraCapture;