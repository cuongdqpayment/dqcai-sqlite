## Những thay đổi quan trọng:

### 1. **Tách biệt trách nhiệm rõ ràng**
- ServiceManager chỉ tập trung quản lý vòng đời các service instances
- Không can thiệp vào việc quản lý database connection (để lại cho DatabaseManager)
- Loại bỏ các chức năng chồng chéo như role management, schema registration

### 2. **Đơn giản hóa cấu hình**
- `ServiceConfig` chỉ chứa thông tin cần thiết: schema, table, primaryKey, serviceClass
- Loại bỏ các cấu hình phức tạp như `SchemaConfig`, `RoleConfig`
- Tự động tạo service với config mặc định nếu chưa đăng ký

### 3. **Quản lý vòng đời hiệu quả**
- Singleton pattern với khả năng reset (cho testing)
- Automatic cleanup cho services không sử dụng
- Proper destruction với resource cleanup
- Method binding để tránh context loss

### 4. **API rõ ràng và nhất quán**
- `getService()` - lấy service (tự động tạo nếu cần)
- `getExistingService()` - chỉ lấy service đã tồn tại
- `destroyService()` - hủy service và cleanup
- `healthCheck()` - kiểm tra sức khỏe tất cả services

### 5. **Transaction support hợp lý**
- Chỉ hỗ trợ transaction trong cùng schema (do SQLite limitation)
- Sử dụng service đầu tiên làm primary service cho transaction
- Auto-initialize tất cả services trước khi transaction

### 6. **Event system đơn giản**
- 4 event types chính: CREATED, DESTROYED, ERROR, HEALTH_CHECK_COMPLETED  
- Support both specific và global event handlers
- Error handling trong event callbacks

### 7. **Metadata tracking**
- Track creation time và last access time
- Support cho cleanup policies
- Service info với trạng thái chi tiết

## Cách sử dụng:

```typescript
import { serviceManager, DefaultService } from './core/service-manager';

// Đăng ký service với custom class
class UserService extends BaseService {
  async getUsersByRole(role: string) {
    return this.findAll({ role });
  }
}

serviceManager.registerService({
  schemaName: 'core',
  tableName: 'users',
  serviceClass: UserService
});

// Sử dụng service
const userService = await serviceManager.getService('core', 'users');
await userService.init();
const users = await (userService as UserService).getUsersByRole('admin');

// Health check
const health = await serviceManager.healthCheck();

// Cleanup
await serviceManager.destroy();
```

Thiết kế mới này tránh chồng chéo với DatabaseManager, tập trung vào việc quản lý service instances một cách hiệu quả và dễ sử dụng.