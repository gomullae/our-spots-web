'use client';

import { useState } from 'react';
import PhotoUploadSection, { PendingPhoto } from '@/components/PhotoUploadSection';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Toast } from '@/hooks/useToast';
import { photoApi } from '@/services/api';
import { Photo, Place, PlaceType } from '@/types';
import { TYPE_CONFIG, GRADE_CONFIG, PUBLIC_TYPES, PERSONAL_TYPES } from '@/constants/placeConfig';
import { CloseIcon } from '@/components/icons';

interface PlaceFormProps {
  latitude: number;
  longitude: number;
  initialAddress?: string;
  initialName?: string;
  initialType?: PlaceType;
  initialDescription?: string;
  initialGrade?: number;
  // 수정 모드에서 이미 첨부된 사진 — 신규 등록은 항상 빈 배열
  initialPhotos?: Photo[];
  isEditMode?: boolean;
  isAuthenticated: boolean;
  // 저장 성공 후 생성/수정된 장소(id 포함)를 반환해야 그 시점에 첨부 사진을 confirm()할 수 있음
  onSubmit: (data: PlaceFormData) => Promise<Place>;
  onClose: () => void;
  showToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

export interface PlaceFormData {
  name: string;
  type: PlaceType;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  grade?: number;
}

export default function PlaceForm({ latitude, longitude, initialAddress, initialName, initialType, initialDescription, initialGrade, initialPhotos, isEditMode, isAuthenticated, onSubmit, onClose, showToast, showConfirm }: PlaceFormProps) {
  const [name, setName] = useState(initialName || '');
  const [type, setType] = useState<PlaceType>(initialType || 'RESTAURANT');
  const [address, setAddress] = useState(initialAddress || '');
  const [description, setDescription] = useState(initialDescription || '');
  const [grade, setGrade] = useState<number>(initialGrade || 3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // 아직 확정(confirm) 안 된 새 사진들 — 저장 성공 후 이 장소의 id로 confirm됨
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  // 사진이 아직 업로드 중이면 저장 버튼을 막음 — 안 그러면 업로드가 덜 끝난 사진이 저장 시점에 조용히 누락될 수 있음
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  useEscapeKey(onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    if (!isAuthenticated) {
      setError('로그인 후 이용해주세요');
      return;
    }
    setError(undefined);
    setIsSubmitting(true);
    try {
      const saved = await onSubmit({
        name: name.trim(),
        type,
        address: address.trim(),
        latitude,
        longitude,
        description: description.trim(),
        grade,
      });
      if (pendingPhotos.length > 0) {
        await Promise.all(pendingPhotos.map((p) => photoApi.confirm('PLACE', saved.id, p.objectKey, p.thumbnailObjectKey)));
      }
      onClose();
    } catch (err) {
      console.error('Failed to save place:', err);
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-80 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">{isEditMode ? '장소 수정' : '장소 추가'}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="닫기"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {PUBLIC_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      type === t ? TYPE_CONFIG[t].activeColor : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>
              {isAuthenticated && (
                <div className="flex gap-2">
                  {PERSONAL_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        type === t ? TYPE_CONFIG[t].activeColor : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="장소 이름"
              className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">주소 *</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="주소를 입력하세요"
              className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">등급</label>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    grade === g
                      ? g === 1
                        ? 'bg-red-500 text-white'
                        : g === 2
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {GRADE_CONFIG[type][g].label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="간단한 설명 (선택)"
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Photos */}
          <PhotoUploadSection
            entityType="PLACE"
            initialPhotos={initialPhotos ?? []}
            onPendingChange={setPendingPhotos}
            onUploadingChange={setIsPhotoUploading}
            showToast={showToast}
            showConfirm={showConfirm}
          />

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!name.trim() || !address.trim() || isSubmitting || isPhotoUploading}
            className="w-full py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '저장 중...' : isPhotoUploading ? '사진 업로드 중...' : isEditMode ? '수정' : '저장'}
          </button>
        </form>
      </div>
    </div>
  );
}
