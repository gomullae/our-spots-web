'use client';

import { useState } from 'react';
import FormModal from '@/components/FormModal';
import PhotoUploadSection, { PendingPhoto } from '@/components/PhotoUploadSection';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Toast } from '@/hooks/useToast';
import { photoApi } from '@/services/api';
import { Marker, Photo, Place, PlaceType } from '@/types';
import { TYPE_CONFIG, GRADE_CONFIG, PUBLIC_TYPES, PERSONAL_TYPES } from '@/constants/placeConfig';
import { distanceMeters } from '@/utils/geo';
import { nameSimilarity } from '@/utils/similarity';

// 근처에 비슷한 이름의 장소가 이미 있는지 경고할 때 쓰는 기준 — 둘 다 숫자만 바꾸면 민감도 조절 가능
const NEARBY_DUPLICATE_RADIUS_METERS = 50;
const SIMILAR_NAME_THRESHOLD = 0.6;

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
  // 신규 등록 모드에서만 전달 — 저장 직전 "근처에 비슷한 이름의 장소가 이미 있는지" 확인용(수정 모드는 검사 대상 아님)
  existingMarkers?: Marker[];
  // 저장 성공 후 생성/수정된 장소(id 포함)를 반환해야 그 시점에 첨부 사진을 confirm()할 수 있음
  onSubmit: (data: PlaceFormData) => Promise<Place>;
  onClose: () => void;
  showToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean, confirmLabel?: string) => void;
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

export default function PlaceForm({ latitude, longitude, initialAddress, initialName, initialType, initialDescription, initialGrade, initialPhotos, isEditMode, isAuthenticated, existingMarkers, onSubmit, onClose, showToast, showConfirm }: PlaceFormProps) {
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
  // 장소 저장(onSubmit)까지는 성공했는데 사진 연결(confirm)만 실패한 경우, 재시도 시 onSubmit을 다시 안 부르기
  // 위해 기억해둠 — 안 그러면 신규 등록에서 장소가 중복 생성되거나(이름+주소 409) 수정에서 불필요한 PUT이 또 나감
  const [savedPlace, setSavedPlace] = useState<Place | null>(null);
  useEscapeKey(onClose);

  const proceedSubmit = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      const saved = savedPlace ?? await onSubmit({
        name: name.trim(),
        type,
        address: address.trim(),
        latitude,
        longitude,
        description: description.trim(),
        grade,
      });
      setSavedPlace(saved);
      if (pendingPhotos.length > 0) {
        try {
          await Promise.all(pendingPhotos.map((p) => photoApi.confirm('PLACE', saved.id, p.objectKey, p.thumbnailObjectKey)));
        } catch (photoErr) {
          // 장소 자체는 이미 저장 완료된 상태라 "저장에 실패했습니다"로 뭉뚱그리면 안 됨 — 폼도 닫지 않고
          // 그대로 둬서, 사용자가 다시 저장을 누르면 위 savedPlace 재사용 분기로 confirm만 다시 시도됨
          console.error('Failed to confirm photos:', photoErr);
          setError('장소는 저장됐지만 사진 연결에 실패했습니다. 다시 시도해주세요');
          return;
        }
      }
      onClose();
    } catch (err) {
      console.error('Failed to save place:', err);
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    if (!isAuthenticated) {
      setError('로그인 후 이용해주세요');
      return;
    }

    // 신규 등록만 검사 — 수정은 이미 존재하는 그 장소 자신과 비교될 뿐이라 대상 아님
    if (!isEditMode && existingMarkers) {
      const trimmedName = name.trim();
      const nearbyDuplicate = existingMarkers.find(
        (m) =>
          distanceMeters(m.latitude, m.longitude, latitude, longitude) <= NEARBY_DUPLICATE_RADIUS_METERS &&
          nameSimilarity(m.name, trimmedName) >= SIMILAR_NAME_THRESHOLD
      );
      if (nearbyDuplicate) {
        showConfirm(`근처에 '${nearbyDuplicate.name}'(이)라는 가게가 이미 등록되어있습니다. 등록하시겠습니까?`, proceedSubmit, false, '등록');
        return;
      }
    }

    await proceedSubmit();
  };

  return (
    <FormModal title={isEditMode ? '장소 수정' : '장소 추가'} onClose={onClose} onSubmit={handleSubmit}>
      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {PUBLIC_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  type === t ? TYPE_CONFIG[t].activeColor : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
          {isAuthenticated && (
            <div className="grid grid-cols-3 gap-2">
              {PERSONAL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
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
    </FormModal>
  );
}
