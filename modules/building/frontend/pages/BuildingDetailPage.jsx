// modules/building/frontend/pages/BuildingDetailPage.jsx
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Edit2, Plus, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx';
import { EmptyState } from '@/components/common/EmptyState.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { MANAGEMENT_ROLES, ROLES } from '@/constants/roles.js';
import { useBuildingById, useFloors, useBulkCreateFloors } from '../hooks/useBuilding.js';
import { BuildingForm } from '../components/BuildingForm.jsx';
import { ApartmentStatusBadge } from '@/components/common/StatusBadge.jsx';

const floorSchema = z.object({
  from_floor: z.number({ invalid_type_error: 'Phải là số' }).int().min(1, 'Tầng tối thiểu là 1'),
  to_floor: z.number({ invalid_type_error: 'Phải là số' }).int().min(1),
}).refine((d) => d.to_floor >= d.from_floor, {
  message: 'Tầng kết thúc phải ≥ tầng bắt đầu',
  path: ['to_floor'],
});

function FloorBulkForm({ buildingId }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(floorSchema),
    defaultValues: { from_floor: 1, to_floor: 1 },
  });

  const { mutate, isPending } = useBulkCreateFloors(buildingId, {
    onSuccess: () => { toast.success('Tạo tầng thành công'); reset(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Tạo tầng thất bại'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutate(d))} className="max-w-sm space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Từ tầng" required error={errors.from_floor?.message}>
          <input
            {...register('from_floor', { valueAsNumber: true })}
            id="floor-from"
            type="number"
            min={1}
            className="input"
          />
        </FormField>
        <FormField label="Đến tầng" required error={errors.to_floor?.message}>
          <input
            {...register('to_floor', { valueAsNumber: true })}
            id="floor-to"
            type="number"
            min={1}
            className="input"
          />
        </FormField>
      </div>
      <button type="submit" disabled={isPending} className="btn-primary" id="create-floors-btn">
        {isPending ? 'Đang tạo...' : 'Tạo tầng'}
      </button>
    </form>
  );
}

export default function BuildingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const buildingId = Number(id);
  const [activeTab, setActiveTab] = useState('floors');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [expandedFloors, setExpandedFloors] = useState({});

  const toggleFloor = useCallback((floorId) => {
    setExpandedFloors((prev) => ({
      ...prev,
      [floorId]: !prev[floorId],
    }));
  }, []);

  const { data: building, isLoading } = useBuildingById(buildingId);
  const { data: floorsData, isLoading: loadingFloors } = useFloors(buildingId);
  const floors = Array.isArray(floorsData) ? floorsData : (floorsData?.items ?? []);

  if (isLoading) return <LoadingSpinner />;
  if (!building) return <EmptyState message="Không tìm thấy tòa nhà" />;

  const tabs = [
    { key: 'floors', label: 'Danh sách tầng' },
    { key: 'add-floors', label: 'Tạo tầng hàng loạt' },
  ];

  return (
    <div>
      <PageHeader
        title={building.name}
        subtitle={building.address}
        backUrl="/buildings"
        action={
          <RoleGuard roles={MANAGEMENT_ROLES}>
            <button
              onClick={() => setIsEditOpen(true)}
              className="btn-secondary"
              id="edit-building-btn"
            >
              <Edit2 size={14} />
              Sửa thông tin
            </button>
          </RoleGuard>
        }
      />

      {/* Info Card */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="info-label">Mã tòa nhà</p>
            <p className="info-value font-mono">{building.code}</p>
          </div>
          <div>
            <p className="info-label">Số tầng</p>
            <p className="info-value">{building.total_floors} tầng</p>
          </div>
          <div>
            <p className="info-label">Địa chỉ</p>
            <p className="info-value">{building.address}</p>
          </div>
          {building.description && (
            <div>
              <p className="info-label">Mô tả</p>
              <p className="info-value">{building.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-5">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab-btn ${activeTab === tab.key ? 'tab-btn-active' : 'tab-btn-inactive'}`}
              id={`tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'floors' && (
        <div>
          {loadingFloors ? (
            <LoadingSpinner />
          ) : floors.length === 0 ? (
            <EmptyState message="Chưa có tầng nào. Dùng tab 'Tạo tầng hàng loạt' để thêm." />
          ) : (
            <div className="space-y-6">
              {floors.map((floor) => (
                <div key={floor.id} className="card p-5 border border-gray-100 shadow-sm bg-white rounded-xl">
                  {/* Floor header */}
                  <div 
                    onClick={() => toggleFloor(floor.id)}
                    className="flex items-center justify-between cursor-pointer group/header select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover/header:bg-blue-100 transition">
                        <Home size={18} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-gray-800 group-hover/header:text-blue-600 transition">Tầng {floor.floor_number}</h4>
                        <p className="text-xs text-gray-400">
                          {floor.apartments?.length ?? 0} căn hộ
                        </p>
                      </div>
                    </div>
                    <div className="text-gray-400 group-hover/header:text-blue-500 transition">
                      {expandedFloors[floor.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                  
                  {/* Apartments list */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedFloors[floor.id] ? 'max-h-[1000px] opacity-100 mt-4 pt-4 border-t border-gray-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    {!floor.apartments || floor.apartments.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Chưa có căn hộ nào ở tầng này.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {floor.apartments.map((apartment) => (
                          <button
                            key={apartment.id}
                            onClick={(e) => { e.stopPropagation(); navigate(`/apartments/${apartment.id}`); }}
                            className="flex flex-col items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-400 hover:shadow-sm transition bg-gray-50 hover:bg-white text-center group/apt"
                            id={`apartment-${apartment.id}`}
                          >
                            <span className="text-sm font-bold text-gray-800 group-hover/apt:text-blue-600 font-mono">
                              {apartment.apartment_code}
                            </span>
                            <span className="mt-1.5">
                              <ApartmentStatusBadge status={apartment.status} />
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'add-floors' && (
        <RoleGuard roles={MANAGEMENT_ROLES}>
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">
              Tạo tầng hàng loạt
            </h3>
            <FloorBulkForm buildingId={buildingId} />
          </div>
        </RoleGuard>
      )}

      {isEditOpen && (
        <BuildingForm onClose={() => setIsEditOpen(false)} building={building} />
      )}
    </div>
  );
}
