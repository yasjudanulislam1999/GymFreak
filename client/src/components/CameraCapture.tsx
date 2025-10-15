import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';

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

  const startCamera = useCallback(async () => {
    try {
      console.log('🎥 Starting camera...');
      setError(null);
      setIsLoading(true);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Get camera stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      console.log('✅ Camera access granted');
      setStream(mediaStream);
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        // Force video to play
        video.play().catch(err => {
          console.log('Video play error:', err);
        });
        
        // Simple timeout - if video doesn't load in 2 seconds, stop loading
        setTimeout(() => {
          console.log('⏰ Camera timeout - stopping loading');
          setIsLoading(false);
        }, 2000);
        
        // Stop loading when video can play
        const handleCanPlay = () => {
          console.log('✅ Video ready');
          setIsLoading(false);
        };
        
        const handleLoadedData = () => {
          console.log('✅ Video data loaded');
          setIsLoading(false);
        };
        
        video.addEventListener('canplay', handleCanPlay, { once: true });
        video.addEventListener('loadeddata', handleLoadedData, { once: true });
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('❌ Camera error:', err);
      let errorMessage = 'Unable to access camera. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported on this device.';
      } else {
        errorMessage += `Error: ${err.message}`;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Resize image to reduce payload size
        const maxWidth = 600;
        const maxHeight = 450;
        let { videoWidth, videoHeight } = video;
        
        // Calculate new dimensions maintaining aspect ratio
        if (videoWidth > maxWidth || videoHeight > maxHeight) {
          const ratio = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
          videoWidth = videoWidth * ratio;
          videoHeight = videoHeight * ratio;
        }
        
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        context.drawImage(video, 0, 0, videoWidth, videoHeight);
        
        // Use lower quality to reduce file size
        const imageData = canvas.toDataURL('image/jpeg', 0.7);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
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

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

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
        maxWidth: '400px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        animation: 'slideDown 0.3s ease-out'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>📸 Food Camera</h3>
          <button
            onClick={cancelCapture}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '8px' }}>⚠️ Camera not available</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Please use text input to describe your food</div>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          {capturedImage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <img
                src={capturedImage}
                alt="Captured food"
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb'
                }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={retakePhoto}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 16px',
                    border: '2px solid #d1d5db',
                    borderRadius: '10px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  <RotateCcw size={16} style={{ marginRight: '8px' }} />
                  Retake
                </button>
                <button
                  onClick={confirmImage}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    fontWeight: '600',
                    boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#059669';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px 0 rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#10b981';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(16, 185, 129, 0.3)';
                  }}
                >
                  <Check size={16} style={{ marginRight: '8px' }} />
                  Use Photo
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                position: 'relative',
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                overflow: 'hidden',
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isLoading ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    color: '#6b7280'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid #e5e7eb',
                      borderTop: '3px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '12px'
                    }}></div>
                    <p style={{ margin: '0', fontSize: '14px' }}>Starting camera...</p>
                  </div>
                ) : stream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onClick={captureImage}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    border: '2px dashed #d1d5db',
                    color: '#6b7280',
                    fontSize: '14px',
                    textAlign: 'center',
                    padding: '20px'
                  }}>
                    <div>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                      <div>Camera not available</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        Please use text input instead
                      </div>
                    </div>
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                {stream ? (
                  <div style={{ 
                    color: '#10b981', 
                    fontSize: '14px', 
                    fontWeight: '500',
                    textAlign: 'center',
                    padding: '20px'
                  }}>
                    📷 Camera ready - Click anywhere to capture
                  </div>
                ) : (
                  <div style={{ 
                    color: '#6b7280', 
                    fontSize: '14px',
                    textAlign: 'center',
                    padding: '20px'
                  }}>
                    📝 Camera not available - Please use text input
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{
          marginTop: '16px',
          fontSize: '13px',
          color: '#6b7280',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          {capturedImage 
            ? "✨ Review your photo and confirm to analyze with AI"
            : "📱 Point your camera at the food and tap capture"
          }
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
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
