import { ApiError, photoApi } from '@/services/api';
import { Toast } from '@/hooks/useToast';
import { PhotoEntityType } from '@/types';
import { clearScheduleCache } from '@/utils/scheduleCache';

interface DeletePhotoOptions {
  photoId: number;
  entityType: PhotoEntityType;
  // 정상 삭제 성공 시 + 이미 지워진 사진(404)이었을 때 둘 다 호출 — 호출부가 로컬 state에서 이 사진을 지우는 등 처리
  onRemoved: () => void;
  showToast: (message: string, type?: Toast['type']) => void;
}

// 사진 삭제 API 호출 공용 처리 — 이미 지워진 사진(다른 기기에서 먼저 삭제, 낡은 로컬 캐시 등)을 다시 지우려고 하면
// 서버가 404를 반환하는데, 이 경우도 실패로 보지 않고 화면에서 정리해서 영구히 안 지워지는 상태를 막음.
// 일정 캐시(schedule-cache-v2)에도 이 낡은 목록이 박혀있을 수 있어 SCHEDULE_EVENT일 때는 캐시도 같이 비움
export async function deletePhotoWithRecovery({ photoId, entityType, onRemoved, showToast }: DeletePhotoOptions): Promise<void> {
  try {
    await photoApi.delete(photoId);
    onRemoved();
    showToast('삭제했습니다', 'success');
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      onRemoved();
      if (entityType === 'SCHEDULE_EVENT') clearScheduleCache();
      showToast('이미 삭제된 사진이에요', 'info');
    } else {
      showToast(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
    }
  }
}
