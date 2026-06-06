import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/axios.js';
import { useAuth } from './AuthContext.jsx';

const BuildingContext = createContext(null);

export function BuildingProvider({ children }) {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingIdState] = useState(() => {
    return localStorage.getItem('selectedBuildingId') || 'all';
  });
  const [isLoading, setIsLoading] = useState(false);

  const setSelectedBuildingId = (id) => {
    setSelectedBuildingIdState(id);
    localStorage.setItem('selectedBuildingId', id);
  };

  useEffect(() => {
    if (!user) {
      setBuildings([]);
      setSelectedBuildingId('all');
      return;
    }

    const fetchMyBuildings = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/building/buildings/my');
        const list = res.data.data || [];
        setBuildings(list);

        // Nếu tòa nhà được chọn trước đó không thuộc danh sách được phép quản lý nữa, reset về 'all'
        const hasCurrent = list.some(b => String(b.id) === String(selectedBuildingId));
        if (selectedBuildingId !== 'all' && !hasCurrent) {
          setSelectedBuildingId('all');
        }
      } catch (err) {
        console.error('Không thể tải danh sách tòa nhà được quản lý:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyBuildings();
  }, [user]);

  const selectedBuilding = buildings.find(b => String(b.id) === String(selectedBuildingId)) || null;

  return (
    <BuildingContext.Provider
      value={{
        buildings,
        selectedBuildingId,
        selectedBuilding,
        setSelectedBuildingId,
        isLoading,
      }}
    >
      {children}
    </BuildingContext.Provider>
  );
}

export function useActiveBuilding() {
  const ctx = useContext(BuildingContext);
  if (!ctx) throw new Error('useActiveBuilding phải được dùng trong BuildingProvider');
  return ctx;
}
