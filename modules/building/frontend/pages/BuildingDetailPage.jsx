// modules/building/frontend/pages/BuildingDetailPage.jsx
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Edit2, Plus, Home } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx';
import { EmptyState } from '@/components/common/EmptyState.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { MANAGEMENT_ROLES, ROLES } from '@/constants/roles.js';
import { useBuildingById, useFloors, useBulkCreateFloors } from '../hooks/useBuilding.js';
import { BuildingForm } from '../components/BuildingForm.jsx';

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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {floors.map((floor) => (
                <button
                  key={floor.id}
                  onClick={() => navigate(`/apartments?floor_id=${floor.id}&building_id=${buildingId}`)}
                  className="card p-4 text-left hover:shadow-md hover:border-blue-200 transition group"
                  id={`floor-${floor.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Tầng {floor.floor_number}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {floor._count?.apartments ?? 0} căn hộ
                      </p>
                    </div>
                    <Home
                      size={18}
                      className="text-gray-300 group-hover:text-blue-400 transition"
                    />
                  </div>
                </button>
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
