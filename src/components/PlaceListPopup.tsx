'use client';

import { Marker } from '@/types';
import { TYPE_CONFIG, PANEL_DIMENSIONS, GRADE_LABELS } from '@/constants/placeConfig';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { clampPosition } from '@/utils/position';

interface PlaceListPopupProps {
  markers: Marker[];
  position: { x: number; y: number };
  onSelect: (marker: Marker) => void;
  onClose: () => void;
}

export default function PlaceListPopup({ markers, position, onSelect, onClose }: PlaceListPopupProps) {
  useEscapeKey(onClose);
  const { LIST_WIDTH: popupWidth, LIST_MAX_HEIGHT: popupMaxHeight } = PANEL_DIMENSIONS;

  const adjustedPosition = typeof window !== 'undefined'
    ? clampPosition(position, { width: popupWidth, height: popupMaxHeight })
    : position;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-20"
        onClick={onClose}
      />

      {/* Popup */}
      <div
        className="fixed z-30 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          width: popupWidth,
          maxHeight: popupMaxHeight,
        }}
      >
        <div className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
          <p className="text-sm font-medium">이 위치의 장소 ({markers.length})</p>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: popupMaxHeight - 40 }}>
          {markers.map((marker) => (
            <button
              key={marker.id}
              onClick={() => onSelect(marker)}
              className="w-full px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900 truncate">{marker.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_CONFIG[marker.type].color}`}>
                  {TYPE_CONFIG[marker.type].label}
                </span>
                {marker.grade && (
                  <span className="text-xs text-gray-500">
                    {GRADE_LABELS.find(g => g.grade === marker.grade)?.label}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
