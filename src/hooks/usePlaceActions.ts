import { useState, useCallback } from 'react';
import { placeApi } from '@/services/api';
import { Marker, Place, PlaceDetail as PlaceDetailType } from '@/types';
import { PlaceFormData } from '@/components/PlaceForm';
import { MAP_ZOOM } from '@/constants/placeConfig';

interface UsePlaceActionsOptions {
  setMarkers: React.Dispatch<React.SetStateAction<Marker[]>>;
  setMoveTo: (moveTo: { lat: number; lng: number; zoom?: number } | null) => void;
}

interface UsePlaceActionsReturn {
  selectedPlace: PlaceDetailType | null;
  isLoadingPlace: boolean;
  panelPosition: { x: number; y: number; markerCenter?: { x: number; y: number; w: number; h: number } } | null;
  groupMarkers: Marker[] | null;
  groupPosition: { x: number; y: number } | null;
  newPlaceCoords: { lat: number; lng: number; address?: string; name?: string } | null;
  editingPlace: PlaceDetailType | null;
  previewPlace: { lat: number; lng: number; address: string; name: string } | null;
  setPreviewPlace: (place: { lat: number; lng: number; address: string; name: string } | null) => void;
  handleMarkerClick: (markers: Marker[], position: { x: number; y: number; markerCenter?: { x: number; y: number; w: number; h: number } }) => void;
  handleGroupMarkerSelect: (marker: Marker) => void;
  handleCloseGroupPopup: () => void;
  handleCloseDetail: () => void;
  handleMapClick: (latlng?: { lat?: number; lng?: number; address?: string }) => void;
  // 폼이 저장 성공 후 생성/수정된 장소(id 포함)를 돌려받아야 이 시점에서야 첨부된 사진을 confirm()할 수 있음
  handleCreatePlace: (data: PlaceFormData) => Promise<Place>;
  handleUpdatePlace: (data: PlaceFormData) => Promise<Place>;
  handleDeletePlace: (placeId: number) => Promise<void>;
  handleEditPlace: (place: PlaceDetailType) => void;
  handleCloseForm: () => void;
  handlePreviewRegister: () => void;
  handlePreviewClose: () => void;
  handleSearchSelect: (result: { lat: number; lng: number; address: string; name?: string }) => void;
  openPlaceById: (id: number, position: { x: number; y: number; markerCenter?: { x: number; y: number; w: number; h: number } }) => Promise<void>;
  clearPanels: () => void;
  clearDetailPanels: () => void;
}

export function usePlaceActions({
  setMarkers,
  setMoveTo,
}: UsePlaceActionsOptions): UsePlaceActionsReturn {
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetailType | null>(null);
  const [isLoadingPlace, setIsLoadingPlace] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number; markerCenter?: { x: number; y: number; w: number; h: number } } | null>(null);
  const [groupMarkers, setGroupMarkers] = useState<Marker[] | null>(null);
  const [groupPosition, setGroupPosition] = useState<{ x: number; y: number } | null>(null);
  const [newPlaceCoords, setNewPlaceCoords] = useState<{ lat: number; lng: number; address?: string; name?: string } | null>(null);
  const [editingPlace, setEditingPlace] = useState<PlaceDetailType | null>(null);
  const [previewPlace, setPreviewPlace] = useState<{ lat: number; lng: number; address: string; name: string } | null>(null);

  const clearDetailPanels = useCallback(() => {
    setSelectedPlace(null);
    setPanelPosition(null);
    setGroupMarkers(null);
    setGroupPosition(null);
  }, []);

  const clearPanels = useCallback(() => {
    clearDetailPanels();
    setPreviewPlace(null);
  }, [clearDetailPanels]);

  const fetchAndShowPlace = useCallback(async (markerId: number, position: { x: number; y: number; markerCenter?: { x: number; y: number; w: number; h: number } }) => {
    setPanelPosition(position);
    setIsLoadingPlace(true);
    try {
      const place = await placeApi.getById(markerId);
      setSelectedPlace(place);
    } catch (err) {
      console.error('Failed to fetch place detail:', err);
    } finally {
      setIsLoadingPlace(false);
    }
  }, []);

  const handleMarkerClick = useCallback(async (markers: Marker[], position: { x: number; y: number; markerCenter?: { x: number; y: number; w: number; h: number } }) => {
    if (markers.length > 1) {
      setGroupMarkers(markers);
      setGroupPosition(position);
      setSelectedPlace(null);
      setPanelPosition(null);
    } else {
      setGroupMarkers(null);
      setGroupPosition(null);
      await fetchAndShowPlace(markers[0].id, position);
    }
  }, [fetchAndShowPlace]);

  const handleGroupMarkerSelect = useCallback(async (marker: Marker) => {
    if (!groupPosition) return;
    const pos = groupPosition;
    setGroupMarkers(null);
    setGroupPosition(null);
    await fetchAndShowPlace(marker.id, pos);
  }, [groupPosition, fetchAndShowPlace]);

  const handleCloseGroupPopup = useCallback(() => {
    setGroupMarkers(null);
    setGroupPosition(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedPlace(null);
    setPanelPosition(null);
  }, []);

  const handleMapClick = useCallback((latlng?: { lat?: number; lng?: number; address?: string }) => {
    clearPanels();
    // 좌표가 있으면 장소 등록 미리보기 진입 (데스크톱 Ctrl/Cmd+Click, 모바일 롱프레스 둘 다 이 경로를 탐)
    if (latlng?.lat != null && latlng?.lng != null) {
      setPreviewPlace({
        lat: latlng.lat,
        lng: latlng.lng,
        address: latlng.address || '',
        name: '',
      });
    }
  }, [clearPanels]);

  const handleCreatePlace = useCallback(async (data: PlaceFormData) => {
    const created = await placeApi.create(data);
    setNewPlaceCoords(null);
    const newMarker: Marker = {
      id: created.id,
      name: created.name,
      type: created.type,
      latitude: created.latitude,
      longitude: created.longitude,
      grade: created.grade,
    };
    setMarkers(prev => [...prev, newMarker]);
    return created;
  }, [setMarkers]);

  const handleCloseForm = useCallback(() => {
    setNewPlaceCoords(null);
    setEditingPlace(null);
  }, []);

  const handleEditPlace = useCallback((place: PlaceDetailType) => {
    setEditingPlace(place);
    setSelectedPlace(null);
    setPanelPosition(null);
  }, []);

  const handleUpdatePlace = useCallback(async (data: PlaceFormData) => {
    if (!editingPlace) throw new Error('수정할 장소를 찾을 수 없습니다');
    const updated = await placeApi.update(editingPlace.id, data);
    setEditingPlace(null);
    setMarkers(prev => prev.map(m => m.id === updated.id ? {
      id: updated.id,
      name: updated.name,
      type: updated.type,
      latitude: updated.latitude,
      longitude: updated.longitude,
      grade: updated.grade,
    } : m));
    return updated;
  }, [editingPlace, setMarkers]);

  const handleDeletePlace = useCallback(async (placeId: number) => {
    await placeApi.delete(placeId);
    setSelectedPlace(null);
    setPanelPosition(null);
    setMarkers(prev => prev.filter(m => m.id !== placeId));
  }, [setMarkers]);

  const handlePreviewRegister = useCallback(() => {
    if (!previewPlace) return;
    setNewPlaceCoords({
      lat: previewPlace.lat,
      lng: previewPlace.lng,
      address: previewPlace.address,
      name: previewPlace.name,
    });
    setPreviewPlace(null);
  }, [previewPlace]);

  const handlePreviewClose = useCallback(() => {
    setPreviewPlace(null);
  }, []);

  const handleSearchSelect = useCallback((result: { lat: number; lng: number; address: string; name?: string }) => {
    setMoveTo({ lat: result.lat, lng: result.lng, zoom: MAP_ZOOM.ON_MOVE });
    setPreviewPlace({
      lat: result.lat,
      lng: result.lng,
      address: result.address,
      name: result.name || result.address,
    });
    setSelectedPlace(null);
    setPanelPosition(null);
    setGroupMarkers(null);
    setGroupPosition(null);
  }, [setMoveTo]);

  const openPlaceById = useCallback(async (id: number, position: { x: number; y: number; markerCenter?: { x: number; y: number; w: number; h: number } }) => {
    await fetchAndShowPlace(id, position);
  }, [fetchAndShowPlace]);

  return {
    selectedPlace,
    isLoadingPlace,
    panelPosition,
    groupMarkers,
    groupPosition,
    newPlaceCoords,
    editingPlace,
    previewPlace,
    setPreviewPlace,
    handleMarkerClick,
    handleGroupMarkerSelect,
    handleCloseGroupPopup,
    handleCloseDetail,
    handleMapClick,
    handleCreatePlace,
    handleUpdatePlace,
    handleDeletePlace,
    handleEditPlace,
    handleCloseForm,
    handlePreviewRegister,
    handlePreviewClose,
    handleSearchSelect,
    openPlaceById,
    clearPanels,
    clearDetailPanels,
  };
}
