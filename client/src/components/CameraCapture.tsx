import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, Check, Zap } from 'lucide-react';

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
      setError(null);
      setIsLoading(true);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Try to get camera with different constraints
      let mediaStream;
      try {
        // First try with back camera
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
      } catch (backCameraError) {
        console.log('Back camera failed, trying front camera:', backCameraError);
        // Fallback to front camera
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
      }
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Add multiple event listeners to ensure loading completes
        const video = videoRef.current;
        
        const handleLoadedData = () => {
          console.log('Video loaded successfully');
          setIsLoading(false);
        };
        
        const handleCanPlay = () => {
          console.log('Video can play');
          setIsLoading(false);
        };
        
        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded');
          setIsLoading(false);
        };
        
        // Add event listeners
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        // Set a timeout to stop loading if video doesn't load
        const timeout = setTimeout(() => {
          console.log('Video loading timeout, stopping loading state');
          setIsLoading(false);
        }, 5000);
        
        // Clean up timeout when video loads
        const cleanup = () => {
          clearTimeout(timeout);
          video.removeEventListener('loadeddata', handleLoadedData);
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
        
        video.addEventListener('loadeddata', cleanup, { once: true });
        video.addEventListener('canplay', cleanup, { once: true });
        video.addEventListener('loadedmetadata', cleanup, { once: true });
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      let errorMessage = 'Unable to access camera. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported on this device.';
      } else {
        errorMessage += 'Please check your camera settings and try again.';
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
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            <div style={{ marginBottom: '8px' }}>{error}</div>
            <button
              onClick={startCamera}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
            >
              🔄 Try Again
            </button>
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
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Starting camera...</p>
                    <button
                      onClick={startCamera}
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3b82f6';
                      }}
                    >
                      🔄 Retry Camera
                    </button>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                )}
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={captureImage}
                  disabled={!stream || isLoading}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '14px 28px',
                    borderRadius: '25px',
                    border: 'none',
                    cursor: stream && !isLoading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    margin: '0 auto',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    opacity: stream && !isLoading ? 1 : 0.6,
                    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (stream && !isLoading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  <>
                    <Zap size={20} style={{ marginRight: '8px' }} />
                    Capture Food
                  </>
                </button>
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
