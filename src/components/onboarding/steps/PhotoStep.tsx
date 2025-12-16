import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Camera, Upload, User } from 'lucide-react';
import { useRef, useState } from 'react';

interface PhotoStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const PhotoStep = ({ value, onChange, onNext, onBack }: PhotoStepProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Add a profile photo</h2>
        <p className="text-muted-foreground">
          Help teammates recognize you
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        {/* Photo Preview */}
        <div
          className={`relative w-40 h-40 rounded-full border-4 transition-all duration-200 overflow-hidden ${
            isDragging
              ? 'border-primary bg-primary/10'
              : value
              ? 'border-primary'
              : 'border-dashed border-border bg-secondary/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {value ? (
            <img
              src={value}
              alt="Profile preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Upload Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Photo
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />

        <p className="text-xs text-muted-foreground text-center">
          Drag and drop an image or click to upload
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button size="lg" onClick={onNext} className="flex-1">
          {value ? 'Continue' : 'Skip for now'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
