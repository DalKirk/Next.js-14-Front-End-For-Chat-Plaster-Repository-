'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Lock, Globe, Key, Users, Image as ImageIcon, Palette, Tag } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomData: any) => Promise<void>;
}

const THUMBNAIL_PRESETS = [
  { id: 'gradient-1', name: 'Ocean Blue', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'gradient-2', name: 'Sunset', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'gradient-3', name: 'Forest', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'gradient-4', name: 'Aurora', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { id: 'gradient-5', name: 'Neon', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { id: 'gradient-6', name: 'Purple Haze', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
];

const CATEGORIES = [
  'Gaming', 'Study', 'Social', 'Work', 'Music', 'Art', 'Tech', 'Sports', 'Other'
];

export default function CreateRoomModal({ isOpen, onClose, onCreateRoom }: CreateRoomModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'public' as 'public' | 'private' | 'password',
    password: '',
    maxMembers: 50,
    category: '',
    tags: [] as string[],
    thumbnailType: 'preset' as 'preset' | 'upload',
    thumbnailPreset: 'gradient-1',
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, thumbnail: 'Image must be less than 5MB' });
        return;
      }
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setFormData({ ...formData, thumbnailType: 'upload' });
      setErrors({ ...errors, thumbnail: '' });
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && formData.tags.length < 5) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Room name is required';
      } else if (formData.name.length < 3) {
        newErrors.name = 'Room name must be at least 3 characters';
      } else if (formData.name.length > 50) {
        newErrors.name = 'Room name must be less than 50 characters';
      }

      if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
      } else if (formData.description.length < 10) {
        newErrors.description = 'Description must be at least 10 characters';
      } else if (formData.description.length > 500) {
        newErrors.description = 'Description must be less than 500 characters';
      }

      if (!formData.category) {
        newErrors.category = 'Please select a category';
      }
    }

    if (currentStep === 3) {
      if (formData.privacy === 'password' && !formData.password) {
        newErrors.password = 'Password is required for password-protected rooms';
      } else if (formData.privacy === 'password' && formData.password.length < 4) {
        newErrors.password = 'Password must be at least 4 characters';
      }

      if (formData.maxMembers < 2) {
        newErrors.maxMembers = 'Room must allow at least 2 members';
      } else if (formData.maxMembers > 1000) {
        newErrors.maxMembers = 'Maximum member limit is 1000';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setIsLoading(true);
    try {
      const roomData: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        privacy: formData.privacy,
        maxMembers: formData.maxMembers,
        category: formData.category,
        tags: formData.tags,
      };

      if (formData.privacy === 'password') {
        roomData.password = formData.password;
      }

      if (formData.thumbnailType === 'upload' && thumbnailFile) {
        roomData.thumbnail = thumbnailFile;
        roomData.thumbnailData = thumbnailPreview;
      } else {
        roomData.thumbnailPreset = formData.thumbnailPreset;
      }

      await onCreateRoom(roomData);
      handleClose();
    } catch (error) {
      console.error('Failed to create room:', error);
      setErrors({ submit: 'Failed to create room. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      name: '',
      description: '',
      privacy: 'public',
      password: '',
      maxMembers: 50,
      category: '',
      tags: [],
      thumbnailType: 'preset',
      thumbnailPreset: 'gradient-1',
    });
    setThumbnailFile(null);
    setThumbnailPreview('');
    setTagInput('');
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10 backdrop-blur-xl">
            <div>
              <h2 className="text-2xl font-bold text-white">Create Your Room</h2>
              <p className="text-sm text-gray-400 mt-1">Step {step} of 3</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      s <= step
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded transition-all ${
                        s < step ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="px-6 pb-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Room Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 bg-gray-800 border ${
                      errors.name ? 'border-red-500' : 'border-gray-700'
                    } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all`}
                    placeholder="e.g., Chill Gaming Lounge"
                    maxLength={50}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                    <p className="text-xs text-gray-500 ml-auto">{formData.name.length}/50</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`w-full px-4 py-3 bg-gray-800 border ${
                      errors.description ? 'border-red-500' : 'border-gray-700'
                    } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none`}
                    placeholder="Describe your room... What's it about? What are the vibes?"
                    rows={4}
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                    <p className="text-xs text-gray-500 ml-auto">{formData.description.length}/500</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((category) => (
                      <button
                        key={category}
                        onClick={() => setFormData({ ...formData, category })}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          formData.category === category
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tags <span className="text-gray-500">(Optional, max 5)</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., competitive, chill, 18+"
                      maxLength={20}
                      disabled={formData.tags.length >= 5}
                    />
                    <button
                      onClick={handleAddTag}
                      disabled={!tagInput.trim() || formData.tags.length >= 5}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Tag size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm flex items-center gap-2 border border-gray-700"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Thumbnail */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    Choose a Thumbnail
                  </label>
                  <div className="flex gap-4 mb-6">
                    <button
                      onClick={() => setFormData({ ...formData, thumbnailType: 'preset' })}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                        formData.thumbnailType === 'preset'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                      }`}
                    >
                      <Palette size={20} />
                      Preset Gradients
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, thumbnailType: 'upload' })}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                        formData.thumbnailType === 'upload'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                      }`}
                    >
                      <Upload size={20} />
                      Upload Image
                    </button>
                  </div>

                  {formData.thumbnailType === 'preset' ? (
                    <div className="grid grid-cols-3 gap-4">
                      {THUMBNAIL_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setFormData({ ...formData, thumbnailPreset: preset.id })}
                          className={`aspect-video rounded-lg transition-all ${
                            formData.thumbnailPreset === preset.id
                              ? 'ring-4 ring-green-500 scale-105'
                              : 'hover:scale-105 ring-2 ring-gray-700'
                          }`}
                          style={{ background: preset.gradient }}
                        >
                          <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm backdrop-blur-[1px]">
                            {preset.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        className="hidden"
                      />
                      {thumbnailPreview ? (
                        <div className="relative">
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail preview"
                            className="w-full aspect-video object-cover rounded-lg border-2 border-gray-700"
                          />
                          <button
                            onClick={() => {
                              setThumbnailFile(null);
                              setThumbnailPreview('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-lg"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full aspect-video bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg hover:border-green-500 hover:bg-gray-750 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-green-400"
                        >
                          <ImageIcon size={48} />
                          <p className="font-medium">Click to upload thumbnail</p>
                          <p className="text-sm">PNG, JPG up to 5MB</p>
                        </button>
                      )}
                      {errors.thumbnail && <p className="text-sm text-red-500 mt-2">{errors.thumbnail}</p>}
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preview
                  </label>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex gap-4">
                      <div
                        className="w-32 h-32 rounded-lg flex-shrink-0 border-2 border-gray-700"
                        style={{
                          background: formData.thumbnailType === 'preset'
                            ? THUMBNAIL_PRESETS.find(p => p.id === formData.thumbnailPreset)?.gradient
                            : thumbnailPreview
                            ? `url(${thumbnailPreview})`
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">{formData.name || 'Room Name'}</h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {formData.description || 'Room description will appear here...'}
                        </p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {formData.category && (
                            <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs border border-gray-600">
                              {formData.category}
                            </span>
                          )}
                          {formData.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs border border-gray-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Privacy & Settings */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    Privacy Settings
                  </label>
                  <div className="space-y-3">
                    <button
                      onClick={() => setFormData({ ...formData, privacy: 'public', password: '' })}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        formData.privacy === 'public'
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Globe className={formData.privacy === 'public' ? 'text-green-400' : 'text-gray-400'} size={24} />
                        <div className="text-left">
                          <h4 className="font-semibold text-white">Public</h4>
                          <p className="text-sm text-gray-400 mt-1">Anyone can find and join this room</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setFormData({ ...formData, privacy: 'private', password: '' })}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        formData.privacy === 'private'
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Lock className={formData.privacy === 'private' ? 'text-green-400' : 'text-gray-400'} size={24} />
                        <div className="text-left">
                          <h4 className="font-semibold text-white">Private</h4>
                          <p className="text-sm text-gray-400 mt-1">Only users with invite link can join</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setFormData({ ...formData, privacy: 'password' })}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        formData.privacy === 'password'
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Key className={formData.privacy === 'password' ? 'text-green-400' : 'text-gray-400'} size={24} />
                        <div className="text-left">
                          <h4 className="font-semibold text-white">Password Protected</h4>
                          <p className="text-sm text-gray-400 mt-1">Requires password to join</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {formData.privacy === 'password' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Room Password <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full px-4 py-3 bg-gray-800 border ${
                        errors.password ? 'border-red-500' : 'border-gray-700'
                      } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500`}
                      placeholder="Enter room password"
                    />
                    {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Maximum Members
                  </label>
                  <div className="flex items-center gap-4">
                    <Users className="text-gray-400" size={24} />
                    <input
                      type="range"
                      min="2"
                      max="1000"
                      value={formData.maxMembers}
                      onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
                      className="flex-1"
                      style={{
                        background: `linear-gradient(to right, rgb(34, 197, 94) 0%, rgb(34, 197, 94) ${(formData.maxMembers - 2) / 998 * 100}%, rgb(55, 65, 81) ${(formData.maxMembers - 2) / 998 * 100}%, rgb(55, 65, 81) 100%)`
                      }}
                    />
                    <input
                      type="number"
                      min="2"
                      max="1000"
                      value={formData.maxMembers}
                      onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 2 })}
                      className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  {errors.maxMembers && <p className="text-sm text-red-500 mt-1">{errors.maxMembers}</p>}
                </div>

                {/* Summary */}
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Room Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white font-medium">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      <span className="text-white font-medium">{formData.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Privacy:</span>
                      <span className="text-white font-medium capitalize">{formData.privacy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Members:</span>
                      <span className="text-white font-medium">{formData.maxMembers}</span>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex justify-between items-start">
                        <span className="text-gray-400">Tags:</span>
                        <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                          {formData.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {errors.submit && (
                  <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
                    <p className="text-red-400 text-sm">{errors.submit}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 border-t border-gray-700 px-6 py-4 flex justify-between backdrop-blur-xl">
            <button
              onClick={step === 1 ? handleClose : handleBack}
              className="px-6 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-all font-medium border border-gray-700"
              disabled={isLoading}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            <button
              onClick={step === 3 ? handleSubmit : handleNext}
              disabled={isLoading}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-medium shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : step === 3 ? 'Create Room' : 'Next'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export { THUMBNAIL_PRESETS };
