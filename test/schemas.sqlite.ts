import { DatabaseSchema, SQLITE_TYPE_MAPPING } from "@dqcai/sqlite";

const core: DatabaseSchema = {
  version: "v1",
  database_name: "temp/core.db",
  description:
    "Cơ sở dữ liệu hệ thống cốt lõi quản lý toàn bộ hoạt động của doanh nghiệp, bao gồm thông tin doanh nghiệp, cửa hàng và người dùng",
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {
    enterprises: {
      description: "Bảng quản lý thông tin các doanh nghiệp trong hệ thống",
      cols: [
        {
          name: "id",
          type: "uuid",
          constraints: "NOT NULL UNIQUE PRIMARY KEY",
          description: "Mã định danh duy nhất của doanh nghiệp",
        },
        {
          name: "name",
          type: "varchar",
          length: 255,
          constraints: "NOT NULL",
          description: "Tên chính thức của doanh nghiệp",
        },
        {
          name: "business_type",
          type: "varchar",
          length: 100,
          description:
            "Loại hình kinh doanh (công ty TNHH, cổ phần, tư nhân, v.v.)",
          enum: [
            "ltd",
            "joint_stock",
            "private",
            "partnership",
            "sole_proprietorship",
          ],
        },
        {
          name: "industries",
          type: "json",
          length: 1024,
          description: "Các ngành nghề kinh doanh",
        },
        {
          name: "address",
          type: "string",
          description: "Địa chỉ trụ sở chính của doanh nghiệp",
        },
        {
          name: "tax_code",
          type: "varchar",
          length: 20,
          description: "Mã số thuế của doanh nghiệp",
        },
        {
          name: "phone",
          type: "varchar",
          length: 20,
          description: "Số điện thoại liên hệ",
        },
        {
          name: "email",
          type: "email",
          description: "Địa chỉ email chính của doanh nghiệp",
        },
        {
          name: "website",
          type: "url",
          description: "Website chính thức của doanh nghiệp",
        },
        {
          name: "logo_url",
          type: "url",
          description: "Đường dẫn đến logo của doanh nghiệp",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "DEFAULT 'active'",
          description: "Trạng thái hoạt động của doanh nghiệp",
          enum: ["active", "inactive", "suspended", "pending"],
        },
        {
          name: "subscription_plan",
          type: "varchar",
          length: 20,
          constraints: "DEFAULT 'basic'",
          description: "Gói dịch vụ đang sử dụng",
          enum: ["basic", "premium", "enterprise"],
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo bản ghi",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian cập nhật bản ghi lần cuối",
        },
      ],
      indexes: [
        {
          name: "idx_enterprises_tax_code",
          columns: ["tax_code"],
          unique: true,
          description: "Index duy nhất cho mã số thuế",
        },
        {
          name: "idx_enterprises_status_plan",
          columns: ["status", "subscription_plan"],
          unique: false,
          description: "Index composite cho trạng thái và gói dịch vụ",
        },
        {
          name: "idx_enterprises_created_at",
          columns: ["created_at"],
          unique: false,
          description: "Index cho thời gian tạo để sắp xếp",
        },
        {
          name: "idx_enterprises_email",
          columns: ["email"],
          unique: true,
          description: "Index duy nhất cho email",
        },
      ],
    },
    stores: {
      description:
        "Bảng quản lý thông tin các cửa hàng/chi nhánh thuộc doanh nghiệp",
      cols: [
        {
          name: "id",
          type: "uuid",
          constraints: "NOT NULL UNIQUE PRIMARY KEY",
          description: "Mã định danh duy nhất của cửa hàng",
        },
        {
          name: "enterprise_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Mã doanh nghiệp sở hữu cửa hàng này",
        },
        {
          name: "name",
          type: "varchar",
          length: 255,
          constraints: "NOT NULL",
          description: "Tên cửa hàng/chi nhánh",
        },
        {
          name: "store_type",
          type: "varchar",
          length: 50,
          description: "Loại cửa hàng",
          enum: ["retail", "warehouse", "showroom", "factory", "office"],
        },
        {
          name: "address",
          type: "string",
          description: "Địa chỉ cửa hàng",
        },
        {
          name: "phone",
          type: "varchar",
          length: 20,
          description: "Số điện thoại cửa hàng",
        },
        {
          name: "email",
          type: "email",
          description: "Email liên hệ của cửa hàng",
        },
        {
          name: "manager_name",
          type: "varchar",
          length: 100,
          description: "Tên quản lý cửa hàng",
        },
        {
          name: "operating_hours",
          type: "json",
          description: "Giờ hoạt động của cửa hàng (JSON format)",
        },
        {
          name: "timezone",
          type: "varchar",
          length: 50,
          constraints: "DEFAULT 'Asia/Ho_Chi_Minh'",
          description: "Múi giờ của cửa hàng",
        },
        {
          name: "currency",
          type: "varchar",
          length: 3,
          constraints: "DEFAULT 'VND'",
          description: "Đơn vị tiền tệ sử dụng (ISO 4217)",
        },
        {
          name: "tax_rate",
          type: "decimal",
          precision: 5,
          scale: 2,
          constraints: "DEFAULT 0",
          description: "Tỷ lệ thuế áp dụng tại cửa hàng (%)",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "DEFAULT 'active'",
          description: "Trạng thái hoạt động",
          enum: ["active", "inactive", "maintenance", "closed"],
        },
        {
          name: "sync_enabled",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description: "Cho phép đồng bộ dữ liệu",
        },
        {
          name: "last_sync",
          type: "timestamp",
          description: "Thời gian đồng bộ dữ liệu lần cuối",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo bản ghi",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian cập nhật bản ghi lần cuối",
        },
      ],
      indexes: [
        {
          name: "idx_stores_enterprise_id",
          columns: ["enterprise_id"],
          unique: false,
          description: "Index cho enterprise_id để tăng tốc join",
        },
        {
          name: "idx_stores_status",
          columns: ["status"],
          unique: false,
          description: "Index cho trạng thái cửa hàng",
        },
        {
          name: "idx_stores_enterprise_status",
          columns: ["enterprise_id", "status"],
          unique: false,
          description: "Index composite cho doanh nghiệp và trạng thái",
        },
      ],
      foreign_keys: [
        {
          name: "fk_stores_enterprise_id",
          columns: ["enterprise_id"],
          references: {
            table: "enterprises",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Khóa ngoại liên kết với bảng enterprises",
        },
      ],
    },
    users: {
      description: "Bảng quản lý thông tin người dùng hệ thống",
      cols: [
        {
          name: "id",
          type: "uuid",
          constraints: "NOT NULL UNIQUE PRIMARY KEY",
          description:
            "Mã định danh duy nhất của người dùng (được sử dụng trong hệ thống)",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Mã cửa hàng mà người dùng thuộc về",
        },
        {
          name: "username",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL UNIQUE",
          description: "Tên đăng nhập của người dùng",
        },
        {
          name: "password_hash",
          type: "varchar",
          length: 255,
          constraints: "NOT NULL",
          description: "Mật khẩu đã được mã hóa",
        },
        {
          name: "full_name",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description: "Họ và tên đầy đủ của người dùng",
        },
        {
          name: "email",
          type: "email",
          constraints: "UNIQUE",
          description: "Địa chỉ email của người dùng",
        },
        {
          name: "phone",
          type: "varchar",
          length: 20,
          description: "Số điện thoại của người dùng",
        },
        {
          name: "role",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL DEFAULT 'staff'",
          description: "Vai trò trong hệ thống",
          enum: ["admin", "manager", "staff", "cashier", "viewer"],
        },
        {
          name: "permissions",
          type: "json",
          description: "Quyền hạn chi tiết của người dùng (JSON format)",
        },
        {
          name: "avatar_url",
          type: "url",
          description: "Đường dẫn đến ảnh đại diện",
        },
        {
          name: "is_active",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description: "Trạng thái tài khoản",
        },
        {
          name: "last_login",
          type: "timestamp",
          description: "Thời gian đăng nhập lần cuối",
        },
        {
          name: "failed_login_attempts",
          type: "integer",
          constraints: "DEFAULT 0",
          description: "Số lần đăng nhập thất bại liên tiếp",
        },
        {
          name: "locked_until",
          type: "timestamp",
          description: "Thời gian khóa tài khoản đến",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo tài khoản",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian cập nhật thông tin lần cuối",
        },
      ],
      indexes: [
        {
          name: "idx_users_username",
          columns: ["username"],
          unique: true,
          description: "Index duy nhất cho tên đăng nhập",
        },
        {
          name: "idx_users_email",
          columns: ["email"],
          unique: true,
          description: "Index duy nhất cho email",
        },
        {
          name: "idx_users_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Index cho store_id để tăng tốc join",
        },
        {
          name: "idx_users_store_role",
          columns: ["store_id", "role"],
          unique: false,
          description: "Index composite cho cửa hàng và vai trò",
        },
        {
          name: "idx_users_active_status",
          columns: ["is_active"],
          unique: false,
          description: "Index cho trạng thái hoạt động",
        },
      ],
      foreign_keys: [
        {
          name: "fk_users_store_id",
          columns: ["store_id"],
          references: {
            table: "stores",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Khóa ngoại liên kết với bảng stores",
        },
      ],
    },
    user_sessions: {
      description: "Bảng quản lý phiên đăng nhập của người dùng",
      cols: [
        {
          name: "id",
          type: "bigint",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Mã định danh duy nhất của phiên đăng nhập",
        },
        {
          name: "user_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Mã người dùng sở hữu phiên đăng nhập",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Mã cửa hàng nơi người dùng đăng nhập",
        },
        {
          name: "session_token",
          type: "varchar",
          length: 255,
          constraints: "NOT NULL UNIQUE",
          description: "Token phiên đăng nhập duy nhất",
        },
        {
          name: "refresh_token",
          type: "varchar",
          length: 255,
          description: "Token làm mới phiên đăng nhập",
        },
        {
          name: "device_info",
          type: "json",
          description: "Thông tin thiết bị đăng nhập (JSON format)",
        },
        {
          name: "ip_address",
          type: "varchar",
          length: 45,
          description: "Địa chỉ IP đăng nhập (hỗ trợ IPv6)",
        },
        {
          name: "user_agent",
          type: "string",
          description: "Thông tin trình duyệt/ứng dụng",
        },
        {
          name: "login_time",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian bắt đầu phiên đăng nhập",
        },
        {
          name: "logout_time",
          type: "timestamp",
          description: "Thời gian kết thúc phiên đăng nhập",
        },
        {
          name: "expires_at",
          type: "timestamp",
          description: "Thời gian hết hạn phiên đăng nhập",
        },
        {
          name: "is_active",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description: "Trạng thái phiên",
        },
      ],
      indexes: [
        {
          name: "idx_sessions_user_id",
          columns: ["user_id"],
          unique: false,
          description: "Index cho user_id để tăng tốc join",
        },
        {
          name: "idx_sessions_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Index cho store_id để tăng tốc join",
        },
        {
          name: "idx_sessions_token",
          columns: ["session_token"],
          unique: true,
          description: "Index duy nhất cho session token",
        },
        {
          name: "idx_sessions_active",
          columns: ["is_active"],
          unique: false,
          description: "Index cho phiên đang hoạt động",
        },
        {
          name: "idx_sessions_expires_at",
          columns: ["expires_at"],
          unique: false,
          description: "Index cho thời gian hết hạn để cleanup",
        },
      ],
      foreign_keys: [
        {
          name: "fk_sessions_user_id",
          columns: ["user_id"],
          references: {
            table: "users",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Khóa ngoại liên kết với bảng users",
        },
        {
          name: "fk_sessions_store_id",
          columns: ["store_id"],
          references: {
            table: "stores",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Khóa ngoại liên kết với bảng stores",
        },
      ],
    },
    settings: {
      description: "Bảng lưu trữ các cấu hình và thiết lập của hệ thống",
      cols: [
        {
          name: "id",
          type: "bigint",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Mã định danh duy nhất của thiết lập",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Mã cửa hàng áp dụng thiết lập này",
        },
        {
          name: "category",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          description: "Danh mục thiết lập",
          enum: [
            "system",
            "payment",
            "notification",
            "display",
            "security",
            "integration",
          ],
        },
        {
          name: "key",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description: "Khóa định danh của thiết lập",
        },
        {
          name: "value",
          type: "string",
          description: "Giá trị của thiết lập",
        },
        {
          name: "default_value",
          type: "string",
          description: "Giá trị mặc định của thiết lập",
        },
        {
          name: "description",
          type: "string",
          description: "Mô tả chi tiết về thiết lập này",
        },
        {
          name: "data_type",
          type: "varchar",
          length: 20,
          constraints: "DEFAULT 'string'",
          description: "Kiểu dữ liệu của giá trị",
          enum: ["string", "number", "boolean", "json", "array"],
        },
        {
          name: "validation_rules",
          type: "json",
          description: "Quy tắc validation cho giá trị (JSON format)",
        },
        {
          name: "is_encrypted",
          type: "boolean",
          constraints: "DEFAULT FALSE",
          description: "Giá trị có được mã hóa không",
        },
        {
          name: "is_system",
          type: "boolean",
          constraints: "DEFAULT FALSE",
          description: "Thiết lập hệ thống (không được phép xóa)",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo thiết lập",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian cập nhật thiết lập lần cuối",
        },
      ],
      indexes: [
        {
          name: "idx_settings_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Index cho store_id để tăng tốc join",
        },
        {
          name: "idx_settings_category",
          columns: ["category"],
          unique: false,
          description: "Index cho danh mục thiết lập",
        },
        {
          name: "idx_settings_store_category_key",
          columns: ["store_id", "category", "key"],
          unique: true,
          description: "Index composite duy nhất cho store, category và key",
        },
      ],
      foreign_keys: [
        {
          name: "fk_settings_store_id",
          columns: ["store_id"],
          references: {
            table: "stores",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Khóa ngoại liên kết với bảng stores",
        },
      ],
    },
  },
};

const oms: DatabaseSchema = {
  version: "v1",
  database_name: "oms.db",
  description:
    "Xử lý đơn hàng từ nhiều kênh (tại cửa hàng, online), quản lý trạng thái và quy trình xử lý đơn hàng.",
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {
    orders: {
      description: "Quản lý thông tin đơn hàng từ nhiều kênh.",
      cols: [
        {
          name: "id",
          type: "uuid",
          constraints: "PRIMARY KEY",
          description: "Định danh duy nhất của đơn hàng.",
        },
        {
          name: "user_id",
          type: "integer",
          description: "Định danh người dùng tạo đơn hàng.",
        },
        {
          name: "customer_id",
          type: "integer",
          description: "Định danh khách hàng đặt đơn hàng.",
        },
        {
          name: "table_id",
          type: "integer",
          description: "Định danh bàn ăn liên quan đến đơn hàng.",
        },
        {
          name: "booking_id",
          type: "uuid",
          description: "Định danh đặt chỗ liên quan đến đơn hàng.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh cửa hàng xử lý đơn hàng.",
        },
        {
          name: "order_number",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL UNIQUE",
          description: "Số đơn hàng.",
        },
        {
          name: "subtotal",
          type: "decimal",
          precision: 10,
          scale: 2,
          constraints: "NOT NULL",
          description: "Tổng giá trị trước thuế và giảm giá.",
        },
        {
          name: "tax_amount",
          type: "decimal",
          precision: 10,
          scale: 2,
          constraints: "DEFAULT 0",
          description: "Số tiền thuế của đơn hàng.",
        },
        {
          name: "discount_amount",
          type: "decimal",
          precision: 10,
          scale: 2,
          constraints: "DEFAULT 0",
          description: "Số tiền giảm giá của đơn hàng.",
        },
        {
          name: "total",
          type: "decimal",
          precision: 10,
          scale: 2,
          constraints: "NOT NULL",
          description: "Tổng giá trị cuối cùng của đơn hàng.",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL DEFAULT 'pending'",
          enum: ["pending", "confirmed", "preparing", "completed", "canceled"],
          description: "Trạng thái của đơn hàng.",
        },
        {
          name: "order_type",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL DEFAULT 'dine_in'",
          enum: ["dine_in", "takeaway", "delivery"],
          description: "Loại đơn hàng (ví dụ: tại chỗ, mang đi).",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo đơn hàng.",
        },
        {
          name: "promotion_id",
          type: "integer",
          description: "Định danh chương trình khuyến mãi áp dụng.",
        },
        {
          name: "online_order_id",
          type: "uuid",
          description: "Định danh đơn hàng online liên quan.",
        },
      ],
      indexes: [
        {
          name: "idx_orders_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id.",
        },
        {
          name: "idx_orders_order_number",
          columns: ["order_number"],
          unique: true,
          description: "Chỉ mục đảm bảo số đơn hàng là duy nhất.",
        },
        {
          name: "idx_orders_customer_id",
          columns: ["customer_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo customer_id.",
        },
      ],
      foreign_keys: [],
    },
    order_items: {
      description: "Chi tiết các mặt hàng trong đơn hàng.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Định danh duy nhất của mục trong đơn hàng.",
        },
        {
          name: "order_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh đơn hàng liên quan.",
        },
        {
          name: "product_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Định danh sản phẩm trong mục đơn hàng.",
        },
        {
          name: "variant_id",
          type: "integer",
          description: "Định danh biến thể sản phẩm trong mục đơn hàng.",
        },
        {
          name: "quantity",
          type: "integer",
          constraints: "NOT NULL",
          description: "Số lượng sản phẩm trong mục đơn hàng.",
        },
        {
          name: "unit_price",
          type: "decimal",
          precision: 10,
          scale: 2,
          constraints: "NOT NULL",
          description: "Đơn giá của sản phẩm.",
        },
        {
          name: "total_price",
          type: "decimal",
          precision: 10,
          scale: 2,
          constraints: "NOT NULL",
          description: "Tổng giá trị của mục đơn hàng.",
        },
        {
          name: "notes",
          type: "varchar",
          length: 500,
          description: "Ghi chú của mục đơn hàng.",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "DEFAULT 'pending'",
          enum: ["pending", "preparing", "served", "canceled"],
          description: "Trạng thái của mục đơn hàng.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo mục đơn hàng.",
        },
      ],
      indexes: [
        {
          name: "idx_order_items_order_id",
          columns: ["order_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo order_id.",
        },
        {
          name: "idx_order_items_product_id",
          columns: ["product_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo product_id.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_order_items_order_id",
          columns: ["order_id"],
          references: {
            table: "orders",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Khóa ngoại liên kết với bảng orders.",
        },
      ],
    },
    transactions: {
      description: "Quản lý các giao dịch thanh toán liên quan đến đơn hàng.",
      cols: [
        {
          name: "id",
          type: "uuid",
          constraints: "PRIMARY KEY",
          description: "Định danh duy nhất của giao dịch.",
        },
        {
          name: "order_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh đơn hàng liên quan đến giao dịch.",
        },
        {
          name: "booking_id",
          type: "uuid",
          description: "Định danh đặt chỗ liên quan đến giao dịch.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh cửa hàng xử lý giao dịch.",
        },
        {
          name: "transaction_number",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL UNIQUE",
          description: "Số giao dịch.",
        },
        {
          name: "amount",
          type: "decimal",
          precision: 10,
          scale: 2,
          constraints: "NOT NULL",
          description: "Số tiền giao dịch.",
        },
        {
          name: "payment_method",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          enum: ["credit_card", "bank_transfer", "mobile_payment", "cash"],
          description: "Phương thức thanh toán của giao dịch.",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL DEFAULT 'pending'",
          enum: ["pending", "completed", "failed", "refunded"],
          description: "Trạng thái của giao dịch.",
        },
        {
          name: "reference_id",
          type: "varchar",
          length: 100,
          description: "Mã tham chiếu của giao dịch.",
        },
        {
          name: "payment_transaction_id",
          type: "uuid",
          description: "Định danh giao dịch thanh toán liên quan.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo giao dịch.",
        },
      ],
      indexes: [
        {
          name: "idx_transactions_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id.",
        },
        {
          name: "idx_transactions_order_id",
          columns: ["order_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo order_id.",
        },
        {
          name: "idx_transactions_transaction_number",
          columns: ["transaction_number"],
          unique: true,
          description: "Chỉ mục đảm bảo số giao dịch là duy nhất.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_transactions_order_id",
          columns: ["order_id"],
          references: {
            table: "orders",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Khóa ngoại liên kết với bảng orders.",
        },
      ],
    },
    online_orders: {
      description: "Quản lý thông tin đơn hàng online và giao hàng.",
      cols: [
        {
          name: "id",
          type: "uuid",
          constraints: "PRIMARY KEY",
          description: "Định danh duy nhất của đơn hàng online.",
        },
        {
          name: "order_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh đơn hàng liên quan.",
        },
        {
          name: "customer_id",
          type: "integer",
          description: "Định danh khách hàng đặt đơn hàng online.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh cửa hàng xử lý đơn hàng.",
        },
        {
          name: "delivery_address",
          type: "varchar",
          length: 255,
          constraints: "NOT NULL",
          description: "Địa chỉ giao hàng.",
        },
        {
          name: "delivery_service",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          description: "Dịch vụ vận chuyển được sử dụng.",
        },
        {
          name: "delivery_fee",
          type: "decimal",
          precision: 10,
          scale: 2,
          constraints: "DEFAULT 0",
          description: "Phí giao hàng.",
        },
        {
          name: "estimated_delivery_time",
          type: "datetime",
          description: "Thời gian giao hàng dự kiến.",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL DEFAULT 'pending'",
          enum: ["pending", "confirmed", "shipped", "delivered", "canceled"],
          description: "Trạng thái của đơn hàng online.",
        },
        {
          name: "tracking_id",
          type: "varchar",
          length: 100,
          description: "Mã theo dõi giao hàng.",
        },
        {
          name: "special_instructions",
          type: "varchar",
          length: 500,
          description: "Hướng dẫn đặc biệt cho giao hàng.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo đơn hàng online.",
        },
      ],
      indexes: [
        {
          name: "idx_online_orders_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id.",
        },
        {
          name: "idx_online_orders_order_id",
          columns: ["order_id"],
          unique: true,
          description:
            "Chỉ mục đảm bảo mỗi đơn hàng online chỉ liên kết với một đơn hàng.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_online_orders_order_id",
          columns: ["order_id"],
          references: {
            table: "orders",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Khóa ngoại liên kết với bảng orders.",
        },
      ],
    },
  },
};

const payment: DatabaseSchema = {
  version: "v1",
  database_name: "payment.db",
  description:
    "Xử lý các giao dịch thanh toán, tích hợp với các cổng thanh toán và quản lý cấu hình liên quan.",
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {
    payment_transactions: {
      description: "Quản lý các giao dịch thanh toán qua cổng thanh toán.",
      cols: [
        {
          name: "id",
          type: "uuid",
          constraints: "PRIMARY KEY",
          description: "Định danh duy nhất của giao dịch thanh toán.",
        },
        {
          name: "transaction_id",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL UNIQUE",
          description: "Định danh giao dịch liên quan.",
        },
        {
          name: "order_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh đơn hàng liên quan đến giao dịch.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh cửa hàng xử lý giao dịch.",
        },
        {
          name: "payment_gateway",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          description: "Tên cổng thanh toán được sử dụng.",
        },
        {
          name: "amount",
          type: "decimal",
          precision: 10,
          scale: 2,
          constraints: "NOT NULL",
          description: "Số tiền giao dịch.",
        },
        {
          name: "currency",
          type: "char",
          length: 3,
          constraints: "NOT NULL DEFAULT 'VND'",
          description: "Loại tiền tệ của giao dịch.",
        },
        {
          name: "payment_method",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          enum: ["credit_card", "bank_transfer", "mobile_payment", "cash"],
          description: "Phương thức thanh toán.",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL DEFAULT 'pending'",
          enum: ["pending", "completed", "failed", "refunded", "canceled"],
          description: "Trạng thái của giao dịch thanh toán.",
        },
        {
          name: "gateway_transaction_id",
          type: "varchar",
          length: 100,
          description: "Mã giao dịch từ cổng thanh toán.",
        },
        {
          name: "gateway_response",
          type: "json",
          description: "Phản hồi từ cổng thanh toán.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo giao dịch thanh toán.",
        },
      ],
      indexes: [
        {
          name: "idx_payment_transactions_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id.",
        },
        {
          name: "idx_payment_transactions_order_id",
          columns: ["order_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo order_id.",
        },
        {
          name: "idx_payment_transactions_transaction_id",
          columns: ["transaction_id"],
          unique: true,
          description: "Chỉ mục đảm bảo transaction_id là duy nhất.",
        },
      ],
    },
    payment_configs: {
      description: "Lưu trữ cấu hình cho các cổng thanh toán.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Định danh duy nhất của cấu hình thanh toán.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh cửa hàng sử dụng cấu hình.",
        },
        {
          name: "payment_method",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          enum: ["credit_card", "bank_transfer", "mobile_payment", "cash"],
          description: "Phương thức thanh toán được cấu hình.",
        },
        {
          name: "gateway_name",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          description: "Tên cổng thanh toán.",
        },
        {
          name: "partner_code",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description: "Mã đối tác của cổng thanh toán.",
        },
        {
          name: "access_key",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description: "Khóa truy cập của cổng thanh toán.",
        },
        {
          name: "secret_key",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description: "Khóa bí mật của cổng thanh toán.",
        },
        {
          name: "endpoint_url",
          type: "url",
          constraints: "NOT NULL",
          description: "URL điểm cuối của cổng thanh toán.",
        },
        {
          name: "is_sandbox",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description:
            "Trạng thái môi trường thử nghiệm (1: sandbox, 0: production).",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL DEFAULT 'active'",
          enum: ["active", "inactive"],
          description: "Trạng thái của cấu hình thanh toán.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo cấu hình thanh toán.",
        },
      ],
      indexes: [
        {
          name: "idx_payment_configs_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id.",
        },
        {
          name: "idx_payment_configs_gateway_name",
          columns: ["gateway_name"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo gateway_name.",
        },
      ],
    },
  },
};

const media: DatabaseSchema = {
  version: "v1",
  database_name: "media.db",
  description:
    "Cơ sở dữ liệu quản lý hình ảnh và thư mục theo cấu trúc cây, hỗ trợ thumbnail và thiết kế multi-tenant.",
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {
    folders: {
      description:
        "Bảng lưu trữ thông tin thư mục theo cấu trúc cây để tổ chức hình ảnh.",
      cols: [
        {
          name: "id",
          type: "integer",
          enum: [],
          description: "Khóa chính của thư mục.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "name",
          type: "string",
          constraints: "NOT NULL",
          length: 255,
          enum: [],
          description: "Tên thư mục.",
        },
        {
          name: "parent_id",
          type: "integer",
          enum: [],
          description: "Khóa thư mục cha để tạo cấu trúc cây.",
        },
        {
          name: "created_at",
          type: "timestamp",
          enum: [],
          description: "Thời gian tạo thư mục.",
        },
        {
          name: "updated_at",
          type: "timestamp",
          enum: [],
          description: "Thời gian cập nhật thư mục.",
        },
      ],
      indexes: [
        {
          name: "idx_folders_store_id",
          columns: ["store_id"],
        },
        {
          name: "idx_folders_parent_id",
          columns: ["parent_id"],
        },
      ],
      foreign_keys: [
        {
          name: "fk_folder_parent_id",
          columns: ["parent_id"],
          references: {
            table: "folders",
            columns: ["id"],
          },
          on_delete: "SET NULL",
          on_update: "CASCADE",
        },
      ],
    },
    images: {
      description:
        "Bảng lưu trữ metadata của hình ảnh, bao gồm đường dẫn lưu trữ local.",
      cols: [
        {
          name: "id",
          type: "integer",
          enum: [],
          description: "Khóa chính của hình ảnh.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "folder_id",
          type: "integer",
          enum: [],
          description: "Khóa thư mục chứa hình ảnh.",
        },
        {
          name: "name",
          type: "string",
          constraints: "NOT NULL",
          length: 255,
          enum: [],
          description: "Tên hình ảnh.",
        },
        {
          name: "path",
          type: "string",
          constraints: "NOT NULL",
          length: 512,
          enum: [],
          description: "Đường dẫn lưu trữ local của hình ảnh gốc.",
        },
        {
          name: "size",
          type: "integer",
          enum: [],
          description: "Kích thước file hình ảnh (byte).",
        },
        {
          name: "mime_type",
          type: "string",
          length: 50,
          enum: [],
          description: "Loại MIME của hình ảnh.",
        },
        {
          name: "created_at",
          type: "timestamp",
          enum: [],
          description: "Thời gian tải lên hình ảnh.",
        },
        {
          name: "updated_at",
          type: "timestamp",
          enum: [],
          description: "Thời gian cập nhật hình ảnh.",
        },
      ],
      indexes: [
        {
          name: "idx_images_store_id",
          columns: ["store_id"],
        },
        {
          name: "idx_images_folder_id",
          columns: ["folder_id"],
        },
      ],
      foreign_keys: [
        {
          name: "fk_image_folder_id",
          columns: ["folder_id"],
          references: {
            table: "folders",
            columns: ["id"],
          },
          on_delete: "SET NULL",
          on_update: "CASCADE",
        },
      ],
    },
    thumbnails: {
      description:
        "Bảng quản lý thumbnail của các hình ảnh, lưu trữ nhiều kích thước thumbnail cho mỗi ảnh.",
      cols: [
        {
          name: "id",
          type: "integer",
          enum: [],
          description: "Khóa chính của thumbnail.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "image_id",
          type: "integer",
          enum: [],
          description: "Khóa hình ảnh gốc liên kết với thumbnail.",
        },
        {
          name: "size",
          type: "string",
          constraints: "NOT NULL",
          length: 50,
          enum: ["small", "medium", "large"],
          description: "Kích thước thumbnail (ví dụ: small, medium, large).",
        },
        {
          name: "path",
          type: "string",
          constraints: "NOT NULL",
          length: 512,
          enum: [],
          description: "Đường dẫn lưu trữ local của thumbnail.",
        },
        {
          name: "created_at",
          type: "timestamp",
          enum: [],
          description: "Thời gian tạo thumbnail.",
        },
      ],
      indexes: [
        {
          name: "idx_thumbnails_store_id",
          columns: ["store_id"],
        },
        {
          name: "idx_thumbnails_image_id",
          columns: ["image_id"],
        },
      ],
      foreign_keys: [
        {
          name: "fk_images_image_id",
          columns: ["image_id"],
          references: {
            table: "images",
            columns: ["id"],
          },
          on_delete: "SET NULL",
          on_update: "CASCADE",
        },
      ],
    },
  },
};

const product: DatabaseSchema = {
  version: "v1",
  database_name: "product.db",
  description:
    "Hệ thống quản lý danh mục sản phẩm, hỗ trợ quản lý danh mục, sản phẩm, biến thể, thuộc tính, hình ảnh và đánh giá sản phẩm. Dùng để quản lý thông tin sản phẩm mà không liên quan đến tồn kho.",
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {
    categories: {
      description:
        "Bảng lưu trữ thông tin các danh mục sản phẩm, hỗ trợ phân cấp và tùy chỉnh giao diện.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho danh mục.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "name",
          type: "varchar",
          length: 255,
          constraints: "NOT NULL",
          description: "Tên của danh mục sản phẩm.",
        },
        {
          name: "description",
          type: "string",
          description: "Mô tả chi tiết về danh mục.",
        },
        {
          name: "parent_id",
          type: "integer",
          description:
            "Mã định danh của danh mục cha, dùng để tạo cấu trúc phân cấp.",
        },
        {
          name: "level",
          type: "integer",
          constraints: "DEFAULT 1",
          description: "Cấp độ của danh mục trong cấu trúc phân cấp.",
        },
        {
          name: "sort_order",
          type: "integer",
          constraints: "DEFAULT 0",
          description: "Thứ tự sắp xếp của danh mục.",
        },
        {
          name: "image_url",
          type: "url",
          description: "Đường dẫn URL của hình ảnh đại diện danh mục.",
        },
        {
          name: "icon",
          type: "varchar",
          length: 50,
          description: "Tên hoặc mã của biểu tượng đại diện danh mục.",
        },
        {
          name: "color",
          type: "varchar",
          length: 7,
          description: "Mã màu sắc dùng để tùy chỉnh giao diện danh mục.",
        },
        {
          name: "is_active",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description: "Trạng thái hoạt động của danh mục.",
        },
        {
          name: "metadata",
          type: "json",
          description: "Dữ liệu bổ sung dạng JSON để lưu thông tin tùy chỉnh.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo danh mục.",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
          description: "Thời gian cập nhật gần nhất của danh mục.",
        },
      ],
      indexes: [
        {
          name: "idx_categories_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
        {
          name: "idx_categories_parent_id",
          columns: ["parent_id"],
          unique: false,
          description:
            "Chỉ mục trên parent_id để hỗ trợ truy vấn danh mục phân cấp.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_categories_parent_id",
          columns: ["parent_id"],
          references: {
            table: "categories",
            columns: ["id"],
          },
          on_delete: "SET NULL",
          on_update: "CASCADE",
          description: "Liên kết đến danh mục cha để tạo cấu trúc phân cấp.",
        },
      ],
    },
    products: {
      description:
        "Bảng lưu trữ thông tin chi tiết của các sản phẩm, hỗ trợ các thuộc tính và tùy chỉnh SEO.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho sản phẩm.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "category_id",
          type: "integer",
          description: "Mã định danh của danh mục mà sản phẩm thuộc về.",
        },
        {
          name: "name",
          type: "varchar",
          length: 255,
          constraints: "NOT NULL",
          description: "Tên của sản phẩm.",
        },
        {
          name: "description",
          type: "string",
          description: "Mô tả chi tiết về sản phẩm.",
        },
        {
          name: "short_description",
          type: "varchar",
          length: 500,
          description: "Mô tả ngắn gọn của sản phẩm.",
        },
        {
          name: "sku",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL UNIQUE",
          description: "Mã SKU duy nhất của sản phẩm.",
        },
        {
          name: "barcode",
          type: "varchar",
          length: 100,
          description: "Mã vạch của sản phẩm.",
        },
        {
          name: "qr_code",
          type: "varchar",
          length: 255,
          description: "Mã QR của sản phẩm.",
        },
        {
          name: "price",
          type: "decimal",
          precision: 15,
          scale: 2,
          constraints: "NOT NULL",
          description: "Giá bán của sản phẩm.",
        },
        {
          name: "cost_price",
          type: "decimal",
          precision: 15,
          scale: 2,
          description: "Giá vốn của sản phẩm.",
        },
        {
          name: "compare_price",
          type: "decimal",
          precision: 15,
          scale: 2,
          description: "Giá so sánh để hiển thị ưu đãi.",
        },
        {
          name: "unit",
          type: "varchar",
          length: 50,
          description: "Đơn vị tính của sản phẩm (ví dụ: cái, hộp).",
        },
        {
          name: "weight",
          type: "decimal",
          precision: 10,
          scale: 2,
          description: "Trọng lượng của sản phẩm.",
        },
        {
          name: "dimensions",
          type: "json",
          description: "Kích thước của sản phẩm (dạng JSON).",
        },
        {
          name: "image_urls",
          type: "json",
          description: "Danh sách URL hình ảnh của sản phẩm (dạng JSON).",
        },
        {
          name: "tags",
          type: "json",
          description: "Thẻ gắn cho sản phẩm (dạng JSON).",
        },
        {
          name: "is_active",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description: "Trạng thái hoạt động của sản phẩm.",
        },
        {
          name: "is_featured",
          type: "boolean",
          constraints: "DEFAULT FALSE",
          description: "Trạng thái nổi bật của sản phẩm.",
        },
        {
          name: "tax_class",
          type: "varchar",
          length: 50,
          description: "Loại thuế áp dụng cho sản phẩm.",
        },
        {
          name: "attributes",
          type: "json",
          description: "Thuộc tính bổ sung của sản phẩm (dạng JSON).",
        },
        {
          name: "seo_title",
          type: "varchar",
          length: 255,
          description: "Tiêu đề SEO của sản phẩm.",
        },
        {
          name: "seo_description",
          type: "string",
          description: "Mô tả SEO của sản phẩm.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo sản phẩm.",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
          description: "Thời gian cập nhật gần nhất của sản phẩm.",
        },
      ],
      indexes: [
        {
          name: "idx_products_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
        {
          name: "idx_products_category_id",
          columns: ["category_id"],
          unique: false,
          description:
            "Chỉ mục trên category_id để hỗ trợ truy vấn theo danh mục.",
        },
        {
          name: "idx_products_sku",
          columns: ["sku"],
          unique: true,
          description:
            "Chỉ mục trên sku để đảm bảo tính duy nhất và truy vấn nhanh.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_products_category_id",
          columns: ["category_id"],
          references: {
            table: "categories",
            columns: ["id"],
          },
          on_delete: "SET NULL",
          on_update: "CASCADE",
          description: "Liên kết sản phẩm với danh mục.",
        },
      ],
    },
    product_variants: {
      description:
        "Bảng lưu trữ thông tin các biến thể của sản phẩm, hỗ trợ tùy chỉnh giá và thuộc tính.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho biến thể.",
        },
        {
          name: "product_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Mã định danh của sản phẩm mà biến thể thuộc về.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "name",
          type: "varchar",
          length: 255,
          constraints: "NOT NULL",
          description: "Tên của biến thể.",
        },
        {
          name: "sku",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL UNIQUE",
          description: "Mã SKU duy nhất của biến thể.",
        },
        {
          name: "barcode",
          type: "varchar",
          length: 100,
          description: "Mã vạch của biến thể.",
        },
        {
          name: "price",
          type: "decimal",
          precision: 15,
          scale: 2,
          constraints: "NOT NULL",
          description: "Giá bán của biến thể.",
        },
        {
          name: "cost_price",
          type: "decimal",
          precision: 15,
          scale: 2,
          description: "Giá vốn của biến thể.",
        },
        {
          name: "compare_price",
          type: "decimal",
          precision: 15,
          scale: 2,
          description: "Giá so sánh của biến thể.",
        },
        {
          name: "weight",
          type: "decimal",
          precision: 10,
          scale: 2,
          description: "Trọng lượng của biến thể.",
        },
        {
          name: "image_url",
          type: "url",
          description: "Đường dẫn URL của hình ảnh biến thể.",
        },
        {
          name: "variant_attributes",
          type: "json",
          description: "Thuộc tính của biến thể (dạng JSON).",
        },
        {
          name: "position",
          type: "integer",
          constraints: "DEFAULT 0",
          description: "Vị trí sắp xếp của biến thể.",
        },
        {
          name: "is_active",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description: "Trạng thái hoạt động của biến thể.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo biến thể.",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
          description: "Thời gian cập nhật gần nhất của biến thể.",
        },
      ],
      indexes: [
        {
          name: "idx_variants_product_id",
          columns: ["product_id"],
          unique: false,
          description:
            "Chỉ mục trên product_id để tối ưu hóa truy vấn biến thể theo sản phẩm.",
        },
        {
          name: "idx_variants_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
        {
          name: "idx_variants_sku",
          columns: ["sku"],
          unique: true,
          description:
            "Chỉ mục trên sku để đảm bảo tính duy nhất và truy vấn nhanh.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_variants_product_id",
          columns: ["product_id"],
          references: {
            table: "products",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Liên kết biến thể với sản phẩm.",
        },
      ],
    },
    product_attributes: {
      description:
        "Bảng lưu trữ các thuộc tính tùy chỉnh của sản phẩm, hỗ trợ tạo biến thể.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho thuộc tính.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "name",
          type: "varchar",
          length: 255,
          constraints: "NOT NULL",
          description: "Tên của thuộc tính.",
        },
        {
          name: "is_required",
          type: "boolean",
          constraints: "DEFAULT FALSE",
          description: "Trạng thái bắt buộc của thuộc tính.",
        },
        {
          name: "is_variation",
          type: "boolean",
          constraints: "DEFAULT FALSE",
          description: "Trạng thái dùng để tạo biến thể.",
        },
        {
          name: "sort_order",
          type: "integer",
          constraints: "DEFAULT 0",
          description: "Thứ tự sắp xếp của thuộc tính.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo thuộc tính.",
        },
      ],
      indexes: [
        {
          name: "idx_attributes_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
      ],
      foreign_keys: [],
    },
    product_images: {
      description:
        "Bảng lưu trữ các hình ảnh liên quan đến sản phẩm, hỗ trợ quản lý đa hình ảnh.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho hình ảnh.",
        },
        {
          name: "product_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Mã định danh của sản phẩm mà hình ảnh thuộc về.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "url",
          type: "url",
          constraints: "NOT NULL",
          description: "Đường dẫn URL của hình ảnh.",
        },
        {
          name: "alt_text",
          type: "varchar",
          length: 255,
          description: "Văn bản thay thế cho hình ảnh.",
        },
        {
          name: "sort_order",
          type: "integer",
          constraints: "DEFAULT 0",
          description: "Thứ tự sắp xếp của hình ảnh.",
        },
        {
          name: "is_primary",
          type: "boolean",
          constraints: "DEFAULT FALSE",
          description: "Trạng thái hình ảnh chính.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo hình ảnh.",
        },
      ],
      indexes: [
        {
          name: "idx_images_product_id",
          columns: ["product_id"],
          unique: false,
          description:
            "Chỉ mục trên product_id để tối ưu hóa truy vấn hình ảnh theo sản phẩm.",
        },
        {
          name: "idx_images_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_images_product_id",
          columns: ["product_id"],
          references: {
            table: "products",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Liên kết hình ảnh với sản phẩm.",
        },
      ],
    },
    product_reviews: {
      description: "Bảng lưu trữ đánh giá của khách hàng về sản phẩm.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho đánh giá.",
        },
        {
          name: "product_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Mã định danh của sản phẩm được đánh giá.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "customer_name",
          type: "varchar",
          length: 255,
          constraints: "NOT NULL",
          description: "Tên của khách hàng đánh giá.",
        },
        {
          name: "customer_email",
          type: "email",
          description: "Email của khách hàng đánh giá.",
        },
        {
          name: "rating",
          type: "integer",
          constraints: "NOT NULL CHECK (rating >= 1 AND rating <= 5)",
          description: "Điểm đánh giá (thang 1-5).",
        },
        {
          name: "title",
          type: "varchar",
          length: 255,
          description: "Tiêu đề của đánh giá.",
        },
        {
          name: "content",
          type: "string",
          description: "Nội dung chi tiết của đánh giá.",
        },
        {
          name: "is_verified",
          type: "boolean",
          constraints: "DEFAULT FALSE",
          description: "Trạng thái xác minh đánh giá.",
        },
        {
          name: "is_approved",
          type: "boolean",
          constraints: "DEFAULT FALSE",
          description: "Trạng thái phê duyệt đánh giá.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo đánh giá.",
        },
      ],
      indexes: [
        {
          name: "idx_reviews_product_id",
          columns: ["product_id"],
          unique: false,
          description:
            "Chỉ mục trên product_id để tối ưu hóa truy vấn đánh giá theo sản phẩm.",
        },
        {
          name: "idx_reviews_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_reviews_product_id",
          columns: ["product_id"],
          references: {
            table: "products",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Liên kết đánh giá với sản phẩm.",
        },
      ],
    },
  },
};

const inventory: DatabaseSchema = {
  version: "v1",
  database_name: "inventory.db",
  description:
    "Hệ thống quản lý tồn kho sản phẩm, hỗ trợ theo dõi nhập xuất tồn, kiểm kê, điều chỉnh tồn kho và cảnh báo hết kho.",
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {
    products: {
      description:
        "Bảng lưu trữ thông tin cơ bản của sản phẩm, dùng để liên kết với dữ liệu tồn kho.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho sản phẩm.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "sku",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL UNIQUE",
          description: "Mã SKU duy nhất của sản phẩm.",
        },
      ],
      indexes: [
        {
          name: "idx_products_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
        {
          name: "idx_products_sku",
          columns: ["sku"],
          unique: true,
          description:
            "Chỉ mục trên sku để đảm bảo tính duy nhất và truy vấn nhanh.",
        },
      ],
      foreign_keys: [],
    },
    product_variants: {
      description:
        "Bảng lưu trữ thông tin cơ bản của biến thể sản phẩm, dùng để liên kết với dữ liệu tồn kho.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho biến thể.",
        },
        {
          name: "product_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Mã định danh của sản phẩm mà biến thể thuộc về.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "sku",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL UNIQUE",
          description: "Mã SKU duy nhất của biến thể.",
        },
      ],
      indexes: [
        {
          name: "idx_variants_product_id",
          columns: ["product_id"],
          unique: false,
          description:
            "Chỉ mục trên product_id để tối ưu hóa truy vấn biến thể theo sản phẩm.",
        },
        {
          name: "idx_variants_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
        {
          name: "idx_variants_sku",
          columns: ["sku"],
          unique: true,
          description:
            "Chỉ mục trên sku để đảm bảo tính duy nhất và truy vấn nhanh.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_variants_product_id",
          columns: ["product_id"],
          references: {
            table: "products",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Liên kết biến thể với sản phẩm.",
        },
      ],
    },
    inventory: {
      description:
        "Bảng lưu trữ thông tin tồn kho của sản phẩm, hỗ trợ quản lý chi tiết tồn kho.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho bản ghi tồn kho.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "product_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Mã định danh của sản phẩm trong tồn kho.",
        },
        {
          name: "variant_id",
          type: "integer",
          description: "Mã định danh của biến thể trong tồn kho.",
        },
        {
          name: "sku",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL UNIQUE",
          description: "Mã SKU của sản phẩm hoặc biến thể.",
        },
        {
          name: "quantity_on_hand",
          type: "integer",
          constraints: "NOT NULL DEFAULT 0",
          description: "Số lượng hiện có trong kho.",
        },
        {
          name: "quantity_reserved",
          type: "integer",
          constraints: "NOT NULL DEFAULT 0",
          description: "Số lượng đã đặt trước.",
        },
        {
          name: "quantity_available",
          type: "integer",
          constraints: "NOT NULL DEFAULT 0",
          description: "Số lượng có sẵn để bán.",
        },
        {
          name: "reorder_level",
          type: "integer",
          constraints: "DEFAULT 0",
          description: "Mức tồn kho tối thiểu để đặt hàng lại.",
        },
        {
          name: "max_stock_level",
          type: "integer",
          description: "Mức tồn kho tối đa cho phép.",
        },
        {
          name: "location",
          type: "varchar",
          length: 100,
          description: "Vị trí lưu trữ trong kho.",
        },
        {
          name: "bin_location",
          type: "varchar",
          length: 100,
          description: "Vị trí cụ thể trong kho (ví dụ: ngăn, kệ).",
        },
        {
          name: "unit_cost",
          type: "decimal",
          precision: 15,
          scale: 2,
          description: "Đơn giá vốn của sản phẩm.",
        },
        {
          name: "total_value",
          type: "decimal",
          precision: 15,
          scale: 2,
          description: "Tổng giá trị tồn kho.",
        },
        {
          name: "last_count_date",
          type: "date",
          description: "Ngày kiểm kê gần nhất.",
        },
        {
          name: "last_movement_date",
          type: "date",
          description: "Ngày di chuyển gần nhất của tồn kho.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo bản ghi tồn kho.",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
          description: "Thời gian cập nhật gần nhất của tồn kho.",
        },
      ],
      indexes: [
        {
          name: "idx_inventory_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
        {
          name: "idx_inventory_product_id",
          columns: ["product_id"],
          unique: false,
          description:
            "Chỉ mục trên product_id để tối ưu hóa truy vấn theo sản phẩm.",
        },
        {
          name: "idx_inventory_variant_id",
          columns: ["variant_id"],
          unique: false,
          description:
            "Chỉ mục trên variant_id để tối ưu hóa truy vấn theo biến thể.",
        },
        {
          name: "idx_inventory_sku",
          columns: ["sku"],
          unique: true,
          description:
            "Chỉ mục trên sku để đảm bảo tính duy nhất và truy vấn nhanh.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_inventory_product_id",
          columns: ["product_id"],
          references: {
            table: "products",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Liên kết tồn kho với sản phẩm.",
        },
        {
          name: "fk_inventory_variant_id",
          columns: ["variant_id"],
          references: {
            table: "product_variants",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Liên kết tồn kho với biến thể.",
        },
      ],
    },
    inventory_movements: {
      description:
        "Bảng lưu trữ lịch sử di chuyển tồn kho, theo dõi nhập xuất kho.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho di chuyển tồn kho.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "inventory_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Mã định danh của bản ghi tồn kho.",
        },
        {
          name: "reference_type",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          enum: ["order", "adjustment", "transfer", "return"],
          description: "Loại tham chiếu (ví dụ: order, adjustment).",
        },
        {
          name: "reference_id",
          type: "varchar",
          length: 100,
          description: "Mã định danh của tham chiếu.",
        },
        {
          name: "movement_type",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          enum: ["in", "out", "adjustment"],
          description: "Loại di chuyển (nhập, xuất, điều chỉnh).",
        },
        {
          name: "quantity",
          type: "integer",
          constraints: "NOT NULL",
          description: "Số lượng di chuyển.",
        },
        {
          name: "unit_cost",
          type: "decimal",
          precision: 15,
          scale: 2,
          description: "Đơn giá của sản phẩm trong di chuyển.",
        },
        {
          name: "total_cost",
          type: "decimal",
          precision: 15,
          scale: 2,
          description: "Tổng chi phí của di chuyển.",
        },
        {
          name: "reason",
          type: "varchar",
          length: 255,
          description: "Lý do di chuyển.",
        },
        {
          name: "notes",
          type: "string",
          description: "Ghi chú bổ sung.",
        },
        {
          name: "user_id",
          type: "integer",
          description: "Mã định danh của người thực hiện di chuyển.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo bản ghi di chuyển.",
        },
      ],
      indexes: [
        {
          name: "idx_movements_inventory_id",
          columns: ["inventory_id"],
          unique: false,
          description:
            "Chỉ mục trên inventory_id để tối ưu hóa truy vấn di chuyển.",
        },
        {
          name: "idx_movements_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_movements_inventory_id",
          columns: ["inventory_id"],
          references: {
            table: "inventory",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Liên kết di chuyển với bản ghi tồn kho.",
        },
      ],
    },
    stock_adjustments: {
      description:
        "Bảng lưu trữ thông tin điều chỉnh tồn kho, hỗ trợ kiểm kê và phê duyệt.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho điều chỉnh tồn kho.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "adjustment_number",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL UNIQUE",
          description: "Số thứ tự của điều chỉnh.",
        },
        {
          name: "reason",
          type: "varchar",
          length: 255,
          constraints: "NOT NULL",
          description: "Lý do điều chỉnh.",
        },
        {
          name: "notes",
          type: "string",
          description: "Ghi chú bổ sung.",
        },
        {
          name: "status",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL DEFAULT 'pending'",
          enum: ["pending", "approved", "rejected"],
          description: "Trạng thái điều chỉnh.",
        },
        {
          name: "user_id",
          type: "integer",
          description: "Mã định danh của người tạo điều chỉnh.",
        },
        {
          name: "approved_by",
          type: "integer",
          description: "Mã định danh của người phê duyệt.",
        },
        {
          name: "approved_at",
          type: "timestamp",
          description: "Thời gian phê duyệt.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo điều chỉnh.",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
          description: "Thời gian cập nhật gần nhất.",
        },
      ],
      indexes: [
        {
          name: "idx_adjustments_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
        {
          name: "idx_adjustments_number",
          columns: ["adjustment_number"],
          unique: true,
          description:
            "Chỉ mục trên adjustment_number để đảm bảo tính duy nhất và truy vấn nhanh.",
        },
      ],
      foreign_keys: [],
    },
    stock_adjustment_items: {
      description: "Bảng lưu trữ chi tiết các mục trong điều chỉnh tồn kho.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho mục điều chỉnh.",
        },
        {
          name: "adjustment_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Mã định danh của điều chỉnh liên quan.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "inventory_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Mã định danh của bản ghi tồn kho.",
        },
        {
          name: "expected_quantity",
          type: "integer",
          constraints: "NOT NULL",
          description: "Số lượng kỳ vọng.",
        },
        {
          name: "actual_quantity",
          type: "integer",
          constraints: "NOT NULL",
          description: "Số lượng thực tế.",
        },
        {
          name: "difference",
          type: "integer",
          constraints: "NOT NULL",
          description: "Sự khác biệt giữa kỳ vọng và thực tế.",
        },
        {
          name: "unit_cost",
          type: "decimal",
          precision: 15,
          scale: 2,
          description: "Đơn giá của sản phẩm.",
        },
        {
          name: "total_cost_impact",
          type: "decimal",
          precision: 15,
          scale: 2,
          description: "Tổng ảnh hưởng chi phí.",
        },
        {
          name: "reason",
          type: "varchar",
          length: 255,
          description: "Lý do điều chỉnh cho mục.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo mục điều chỉnh.",
        },
      ],
      indexes: [
        {
          name: "idx_adjustment_items_adjustment_id",
          columns: ["adjustment_id"],
          unique: false,
          description:
            "Chỉ mục trên adjustment_id để tối ưu hóa truy vấn mục điều chỉnh.",
        },
        {
          name: "idx_adjustment_items_inventory_id",
          columns: ["inventory_id"],
          unique: false,
          description:
            "Chỉ mục trên inventory_id để tối ưu hóa truy vấn theo tồn kho.",
        },
        {
          name: "idx_adjustment_items_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_adjustment_items_adjustment_id",
          columns: ["adjustment_id"],
          references: {
            table: "stock_adjustments",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Liên kết mục điều chỉnh với điều chỉnh.",
        },
        {
          name: "fk_adjustment_items_inventory_id",
          columns: ["inventory_id"],
          references: {
            table: "inventory",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Liên kết mục điều chỉnh với tồn kho.",
        },
      ],
    },
    inventory_counts: {
      description:
        "Bảng lưu trữ thông tin kiểm kê tồn kho, hỗ trợ quản lý quy trình kiểm kê.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho kiểm kê.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "count_number",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL UNIQUE",
          description: "Số thứ tự của kiểm kê.",
        },
        {
          name: "count_type",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          enum: ["full", "partial"],
          description: "Loại kiểm kê (toàn bộ, từng phần).",
        },
        {
          name: "status",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL DEFAULT 'in_progress'",
          enum: ["in_progress", "completed"],
          description: "Trạng thái kiểm kê.",
        },
        {
          name: "location",
          type: "varchar",
          length: 100,
          description: "Vị trí kiểm kê.",
        },
        {
          name: "notes",
          type: "string",
          description: "Ghi chú bổ sung.",
        },
        {
          name: "started_by",
          type: "integer",
          description: "Mã định danh của người bắt đầu kiểm kê.",
        },
        {
          name: "completed_by",
          type: "integer",
          description: "Mã định danh của người hoàn tất kiểm kê.",
        },
        {
          name: "started_at",
          type: "timestamp",
          description: "Thời gian bắt đầu kiểm kê.",
        },
        {
          name: "completed_at",
          type: "timestamp",
          description: "Thời gian hoàn tất kiểm kê.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo bản ghi kiểm kê.",
        },
      ],
      indexes: [
        {
          name: "idx_counts_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
        {
          name: "idx_counts_number",
          columns: ["count_number"],
          unique: true,
          description:
            "Chỉ mục trên count_number để đảm bảo tính duy nhất và truy vấn nhanh.",
        },
      ],
      foreign_keys: [],
    },
    inventory_count_items: {
      description:
        "Bảng lưu trữ chi tiết các mục trong quá trình kiểm kê tồn kho.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho mục kiểm kê.",
        },
        {
          name: "count_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Mã định danh của kiểm kê liên quan.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "inventory_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Mã định danh của bản ghi tồn kho.",
        },
        {
          name: "expected_quantity",
          type: "integer",
          constraints: "NOT NULL",
          description: "Số lượng kỳ vọng.",
        },
        {
          name: "counted_quantity",
          type: "integer",
          constraints: "NOT NULL",
          description: "Số lượng đã kiểm.",
        },
        {
          name: "difference",
          type: "integer",
          constraints: "NOT NULL",
          description: "Sự khác biệt giữa kỳ vọng và thực tế.",
        },
        {
          name: "notes",
          type: "string",
          description: "Ghi chú bổ sung.",
        },
        {
          name: "counted_by",
          type: "integer",
          description: "Mã định danh của người kiểm.",
        },
        {
          name: "counted_at",
          type: "timestamp",
          description: "Thời gian kiểm.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo bản ghi mục kiểm kê.",
        },
      ],
      indexes: [
        {
          name: "idx_count_items_count_id",
          columns: ["count_id"],
          unique: false,
          description:
            "Chỉ mục trên count_id để tối ưu hóa truy vấn mục kiểm kê.",
        },
        {
          name: "idx_count_items_inventory_id",
          columns: ["inventory_id"],
          unique: false,
          description:
            "Chỉ mục trên inventory_id để tối ưu hóa truy vấn theo tồn kho.",
        },
        {
          name: "idx_count_items_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_count_items_count_id",
          columns: ["count_id"],
          references: {
            table: "inventory_counts",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Liên kết mục kiểm kê với kiểm kê.",
        },
        {
          name: "fk_count_items_inventory_id",
          columns: ["inventory_id"],
          references: {
            table: "inventory",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Liên kết mục kiểm kê với tồn kho.",
        },
      ],
    },
    low_stock_alerts: {
      description:
        "Bảng lưu trữ thông báo khi tồn kho đạt mức thấp, hỗ trợ quản lý cảnh báo.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho cảnh báo.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh của cửa hàng, dùng để liên kết với dữ liệu cửa hàng.",
        },
        {
          name: "inventory_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Mã định danh của bản ghi tồn kho.",
        },
        {
          name: "current_quantity",
          type: "integer",
          constraints: "NOT NULL",
          description: "Số lượng hiện tại.",
        },
        {
          name: "reorder_level",
          type: "integer",
          constraints: "NOT NULL",
          description: "Mức tồn kho tối thiểu.",
        },
        {
          name: "alert_level",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          enum: ["low", "critical"],
          description: "Mức độ cảnh báo (thấp, rất thấp).",
        },
        {
          name: "is_acknowledged",
          type: "boolean",
          constraints: "DEFAULT FALSE",
          description: "Trạng thái xác nhận cảnh báo.",
        },
        {
          name: "acknowledged_by",
          type: "integer",
          description: "Mã định danh của người xác nhận.",
        },
        {
          name: "acknowledged_at",
          type: "timestamp",
          description: "Thời gian xác nhận.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo cảnh báo.",
        },
      ],
      indexes: [
        {
          name: "idx_alerts_inventory_id",
          columns: ["inventory_id"],
          unique: false,
          description:
            "Chỉ mục trên inventory_id để tối ưu hóa truy vấn cảnh báo.",
        },
        {
          name: "idx_alerts_store_id",
          columns: ["store_id"],
          unique: false,
          description:
            "Chỉ mục trên store_id để tối ưu hóa truy vấn theo cửa hàng.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_alerts_inventory_id",
          columns: ["inventory_id"],
          references: {
            table: "inventory",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Liên kết cảnh báo với tồn kho.",
        },
      ],
    },
  },
};

const fnb: DatabaseSchema = {
  version: "v1",
  database_name: "fnb.db",
  description:
    "Module chuyên dụng cho ngành F&B, quản lý sơ đồ bàn và thông tin đặt chỗ của khách hàng.",
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {
    tables: {
      description: "Quản lý thông tin về các bàn ăn trong nhà hàng.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Định danh duy nhất của bàn ăn.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh cửa hàng sở hữu bàn ăn.",
        },
        {
          name: "name",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          description: "Tên hoặc mã số của bàn ăn.",
        },
        {
          name: "capacity",
          type: "integer",
          constraints: "NOT NULL",
          description: "Sức chứa của bàn ăn.",
        },
        {
          name: "location",
          type: "varchar",
          length: 100,
          description: "Vị trí của bàn ăn trong nhà hàng.",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "DEFAULT 'available'",
          enum: ["available", "occupied", "reserved", "maintenance"],
          description: "Trạng thái của bàn ăn (ví dụ: có sẵn, đang sử dụng).",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo thông tin bàn ăn.",
        },
      ],
      indexes: [
        {
          name: "idx_tables_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id.",
        },
        {
          name: "idx_tables_name_store_id",
          columns: ["name", "store_id"],
          unique: true,
          description: "Chỉ mục đảm bảo tên bàn ăn là duy nhất trong cửa hàng.",
        },
      ],
      foreign_keys: [],
    },
    bookings: {
      description: "Quản lý thông tin đặt chỗ của khách hàng.",
      cols: [
        {
          name: "id",
          type: "uuid",
          constraints: "PRIMARY KEY",
          description: "Định danh duy nhất của đặt chỗ.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh cửa hàng liên quan đến đặt chỗ.",
        },
        {
          name: "customer_id",
          type: "integer",
          description: "Định danh khách hàng đặt chỗ.",
        },
        {
          name: "table_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Định danh bàn ăn được đặt.",
        },
        {
          name: "guest_count",
          type: "integer",
          constraints: "NOT NULL",
          description: "Số lượng khách trong đặt chỗ.",
        },
        {
          name: "booking_date",
          type: "date",
          constraints: "NOT NULL",
          description: "Ngày đặt chỗ.",
        },
        {
          name: "booking_time",
          type: "time",
          constraints: "NOT NULL",
          description: "Thời gian đặt chỗ.",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL DEFAULT 'confirmed'",
          enum: ["confirmed", "pending", "cancelled", "completed"],
          description: "Trạng thái của đặt chỗ.",
        },
        {
          name: "special_requests",
          type: "varchar",
          length: 500,
          description: "Yêu cầu đặc biệt của khách hàng.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo đặt chỗ.",
        },
      ],
      indexes: [
        {
          name: "idx_bookings_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id.",
        },
        {
          name: "idx_bookings_table_id",
          columns: ["table_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo table_id.",
        },
        {
          name: "idx_bookings_booking_date",
          columns: ["booking_date"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo ngày đặt chỗ.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_bookings_table_id",
          columns: ["table_id"],
          references: {
            table: "tables",
            columns: ["id"],
          },
          on_delete: "RESTRICT",
          on_update: "CASCADE",
          description: "Khóa ngoại liên kết với bảng tables.",
        },
      ],
    },
  },
};

const scm: DatabaseSchema = {
  version: "v1",
  database_name: "scm.db",
  description:
    "Quản lý chuỗi cung ứng, bao gồm thông tin nhà cung cấp, đơn đặt hàng và quy trình nhập kho.",
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {
    suppliers: {
      description: "Lưu trữ thông tin về các nhà cung cấp.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Định danh duy nhất của nhà cung cấp.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh cửa hàng liên kết với nhà cung cấp.",
        },
        {
          name: "name",
          type: "varchar",
          length: 255,
          constraints: "NOT NULL",
          description: "Tên của nhà cung cấp.",
        },
        {
          name: "contact_person",
          type: "varchar",
          length: 100,
          description: "Tên người liên hệ của nhà cung cấp.",
        },
        {
          name: "phone",
          type: "varchar",
          length: 20,
          description: "Số điện thoại của nhà cung cấp.",
        },
        {
          name: "email",
          type: "email",
          description: "Email của nhà cung cấp.",
        },
        {
          name: "address",
          type: "varchar",
          length: 255,
          description: "Địa chỉ của nhà cung cấp.",
        },
        {
          name: "tax_code",
          type: "varchar",
          length: 50,
          description: "Mã số thuế của nhà cung cấp.",
        },
        {
          name: "bank_account",
          type: "varchar",
          length: 100,
          description: "Thông tin tài khoản ngân hàng của nhà cung cấp.",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL DEFAULT 'active'",
          enum: ["active", "inactive", "suspended"],
          description: "Trạng thái hoạt động của nhà cung cấp.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo thông tin nhà cung cấp.",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
          description: "Thời gian cập nhật gần nhất của nhà cung cấp.",
        },
      ],
      indexes: [
        {
          name: "idx_suppliers_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id.",
        },
      ],
      foreign_keys: [],
    },
    purchase_orders: {
      description: "Quản lý các đơn đặt hàng từ nhà cung cấp.",
      cols: [
        {
          name: "id",
          type: "uuid",
          constraints: "PRIMARY KEY",
          description: "Định danh duy nhất của đơn đặt hàng.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh cửa hàng đặt hàng.",
        },
        {
          name: "supplier_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Định danh nhà cung cấp liên quan.",
        },
        {
          name: "user_id",
          type: "integer",
          description: "Định danh người dùng tạo đơn hàng.",
        },
        {
          name: "order_number",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL UNIQUE",
          description: "Số đơn đặt hàng.",
        },
        {
          name: "total_amount",
          type: "decimal",
          precision: 10,
          scale: 2,
          constraints: "NOT NULL",
          description: "Tổng giá trị đơn đặt hàng.",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL DEFAULT 'pending'",
          enum: ["pending", "confirmed", "shipped", "received", "canceled"],
          description: "Trạng thái của đơn đặt hàng.",
        },
        {
          name: "order_date",
          type: "date",
          constraints: "NOT NULL",
          description: "Ngày đặt hàng.",
        },
        {
          name: "expected_date",
          type: "date",
          description: "Ngày dự kiến nhận hàng.",
        },
        {
          name: "received_date",
          type: "date",
          description: "Ngày nhận hàng thực tế.",
        },
        {
          name: "notes",
          type: "varchar",
          length: 500,
          description: "Ghi chú của đơn đặt hàng.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo đơn đặt hàng.",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
          description: "Thời gian cập nhật gần nhất của đơn đặt hàng.",
        },
      ],
      indexes: [
        {
          name: "idx_purchase_orders_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id.",
        },
        {
          name: "idx_purchase_orders_supplier_id",
          columns: ["supplier_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo supplier_id.",
        },
        {
          name: "idx_purchase_orders_order_number",
          columns: ["order_number"],
          unique: true,
          description: "Chỉ mục đảm bảo số đơn đặt hàng là duy nhất.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_purchase_orders_supplier_id",
          columns: ["supplier_id"],
          references: {
            table: "suppliers",
            columns: ["id"],
          },
          on_delete: "RESTRICT",
          on_update: "CASCADE",
          description: "Khóa ngoại liên kết với bảng suppliers.",
        },
      ],
    },
    purchase_order_items: {
      description: "Chi tiết các mặt hàng trong đơn đặt hàng.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Định danh duy nhất của mục trong đơn đặt hàng.",
        },
        {
          name: "purchase_order_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh đơn đặt hàng liên quan.",
        },
        {
          name: "product_id",
          type: "integer",
          constraints: "NOT NULL",
          description: "Định danh sản phẩm trong mục đơn hàng.",
        },
        {
          name: "variant_id",
          type: "integer",
          description: "Định danh biến thể sản phẩm trong mục đơn hàng.",
        },
        {
          name: "quantity",
          type: "integer",
          constraints: "NOT NULL CHECK (quantity >= 0)",
          description: "Số lượng sản phẩm trong mục đơn hàng.",
        },
        {
          name: "unit_price",
          type: "decimal",
          precision: 10,
          scale: 2,
          constraints: "NOT NULL CHECK (unit_price >= 0)",
          description: "Đơn giá của sản phẩm.",
        },
        {
          name: "total_price",
          type: "decimal",
          precision: 10,
          scale: 2,
          constraints: "NOT NULL CHECK (total_price >= 0)",
          description: "Tổng giá trị của mục đơn hàng.",
        },
        {
          name: "received_quantity",
          type: "integer",
          constraints: "NOT NULL DEFAULT 0 CHECK (received_quantity >= 0)",
          description: "Số lượng sản phẩm đã nhận.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo mục đơn hàng.",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
          description: "Thời gian cập nhật gần nhất của mục đơn hàng.",
        },
      ],
      indexes: [
        {
          name: "idx_purchase_order_items_purchase_order_id",
          columns: ["purchase_order_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo purchase_order_id.",
        },
        {
          name: "idx_purchase_order_items_product_id",
          columns: ["product_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo product_id.",
        },
        {
          name: "idx_purchase_order_items_variant_id",
          columns: ["variant_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo variant_id.",
        },
      ],
      foreign_keys: [
        {
          name: "fk_purchase_order_items_purchase_order_id",
          columns: ["purchase_order_id"],
          references: {
            table: "purchase_orders",
            columns: ["id"],
          },
          on_delete: "CASCADE",
          on_update: "CASCADE",
          description: "Khóa ngoại liên kết với bảng purchase_orders.",
        },
      ],
    },
  },
};

const config: DatabaseSchema = {
  version: "v1",
  database_name: "config.db",
  description:
    "Cơ sở dữ liệu quản lý cấu hình hệ thống - Lưu trữ tất cả các thiết lập, tham số cấu hình, quy tắc kinh doanh và feature flags của từng cửa hàng. Hỗ trợ tùy chỉnh linh hoạt theo nhu cầu kinh doanh cụ thể của từng store mà không cần thay đổi code ứng dụng.",
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {
    settings: {
      description:
        "Bảng lưu trữ các thiết lập cấu hình hệ thống theo từng cửa hàng",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description:
            "Khóa chính tự động tăng, định danh duy nhất cho mỗi thiết lập",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description:
            "Mã định danh cửa hàng - khóa liên kết với hệ thống core, xác định thiết lập thuộc về cửa hàng nào",
        },
        {
          name: "category",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          enum: ["payment", "notification", "business_rules", "ui_config"],
          description:
            "Danh mục phân loại thiết lập (vd: payment, notification, business_rules, ui_config) để nhóm các cấu hình cùng loại",
        },
        {
          name: "key",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description:
            "Khóa định danh duy nhất của thiết lập trong category (vd: tax_rate, loyalty_points_ratio, max_discount_percent)",
        },
        {
          name: "value",
          type: "varchar",
          length: 1000,
          description:
            "Giá trị của thiết lập được lưu dưới dạng text, có thể là string, number hoặc JSON tùy theo data_type",
        },
        {
          name: "description",
          type: "varchar",
          length: 500,
          description:
            "Mô tả chi tiết về chức năng và cách sử dụng của thiết lập này, giúp admin hiểu rõ tác dụng",
        },
        {
          name: "data_type",
          type: "varchar",
          length: 20,
          constraints: "DEFAULT 'string'",
          enum: ["string", "number", "boolean", "json", "array"],
          description:
            "Kiểu dữ liệu của value (string, number, boolean, json, array) để ứng dụng parse đúng định dạng",
        },
        {
          name: "is_encrypted",
          type: "boolean",
          constraints: "DEFAULT FALSE",
          description:
            "Flag đánh dấu value có được mã hóa hay không (0=không, 1=có) cho các thông tin nhạy cảm như API key",
        },
        {
          name: "is_system",
          type: "boolean",
          constraints: "DEFAULT FALSE",
          description:
            "Flag phân biệt thiết lập hệ thống (0=user config, 1=system config) để kiểm soát quyền chỉnh sửa",
        },
        {
          name: "is_active",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description:
            "Trạng thái kích hoạt của thiết lập (0=vô hiệu, 1=kích hoạt) để tạm thời disable mà không xóa",
        },
        {
          name: "validation_rules",
          type: "json",
          description:
            "Quy tắc validation dưới dạng JSON để kiểm tra tính hợp lệ của value khi cập nhật (min, max, regex, enum)",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời điểm tạo thiết lập ban đầu",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời điểm cập nhật gần nhất của thiết lập",
        },
        {
          name: "updated_by",
          type: "integer",
          description: "ID của user thực hiện cập nhật gần nhất để audit trail",
        },
      ],
      indexes: [
        {
          name: "idx_settings_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id",
        },
        {
          name: "idx_settings_category_key",
          columns: ["category", "key"],
          unique: true,
          description: "Chỉ mục đảm bảo cặp category-key là duy nhất",
        },
      ],
      foreign_keys: [],
    },
    feature_flags: {
      description:
        "Bảng quản lý các tính năng có thể bật/tắt động cho từng cửa hàng",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Khóa chính tự động tăng",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Mã định danh cửa hàng áp dụng feature flag",
        },
        {
          name: "feature_name",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description:
            "Tên định danh của tính năng (vd: online_ordering, loyalty_program, multi_payment)",
        },
        {
          name: "is_enabled",
          type: "boolean",
          constraints: "DEFAULT FALSE",
          description: "Trạng thái bật/tắt tính năng (0=tắt, 1=bật)",
        },
        {
          name: "rollout_percentage",
          type: "integer",
          constraints: "DEFAULT 100",
          description:
            "Phần trăm rollout tính năng (0-100) để triển khai từ từ hoặc A/B testing",
        },
        {
          name: "target_users",
          type: "json",
          description:
            "Danh sách user_id hoặc điều kiện target cụ thể dưới dạng JSON",
        },
        {
          name: "start_date",
          type: "timestamp",
          description: "Thời điểm bắt đầu kích hoạt tính năng",
        },
        {
          name: "end_date",
          type: "timestamp",
          description: "Thời điểm kết thúc tính năng (nếu có)",
        },
        {
          name: "description",
          type: "varchar",
          length: 500,
          description: "Mô tả chức năng và mục đích của tính năng",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời điểm tạo feature flag",
        },
      ],
      indexes: [
        {
          name: "idx_feature_flags_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id",
        },
        {
          name: "idx_feature_flags_feature_name",
          columns: ["feature_name"],
          unique: true,
          description: "Chỉ mục đảm bảo feature_name là duy nhất",
        },
      ],
      foreign_keys: [],
    },
    business_rules: {
      description: "Bảng lưu trữ các quy tắc kinh doanh có thể cấu hình động",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Khóa chính tự động tăng",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Mã định danh cửa hàng áp dụng quy tắc",
        },
        {
          name: "rule_name",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description:
            "Tên định danh quy tắc (vd: discount_limit, refund_policy, loyalty_expiry)",
        },
        {
          name: "rule_type",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL",
          enum: ["validation", "calculation", "workflow", "policy"],
          description:
            "Loại quy tắc (validation, calculation, workflow, policy) để phân loại xử lý",
        },
        {
          name: "conditions",
          type: "json",
          description:
            "Điều kiện áp dụng quy tắc dưới dạng JSON (vd: order_amount > 1000000)",
        },
        {
          name: "actions",
          type: "json",
          description:
            "Hành động thực hiện khi thỏa mãn điều kiện dưới dạng JSON",
        },
        {
          name: "priority",
          type: "integer",
          constraints: "DEFAULT 0",
          description:
            "Thứ tự ưu tiên thực hiện quy tắc khi có nhiều quy tắc cùng trigger",
        },
        {
          name: "is_active",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description: "Trạng thái kích hoạt quy tắc (0=vô hiệu, 1=kích hoạt)",
        },
        {
          name: "effective_from",
          type: "timestamp",
          description: "Thời điểm bắt đầu hiệu lực của quy tắc",
        },
        {
          name: "effective_to",
          type: "timestamp",
          description: "Thời điểm kết thúc hiệu lực của quy tắc",
        },
        {
          name: "description",
          type: "varchar",
          length: 500,
          description: "Mô tả chi tiết quy tắc và cách thức hoạt động",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời điểm tạo quy tắc",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời điểm cập nhật gần nhất",
        },
      ],
      indexes: [
        {
          name: "idx_business_rules_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id",
        },
        {
          name: "idx_business_rules_rule_name",
          columns: ["rule_name"],
          unique: true,
          description: "Chỉ mục đảm bảo rule_name là duy nhất",
        },
      ],
      foreign_keys: [],
    },
    workflow_templates: {
      description: "Bảng lưu trữ template quy trình làm việc có thể tùy chỉnh",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Khóa chính tự động tăng",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Mã định danh cửa hàng sở hữu workflow template",
        },
        {
          name: "template_name",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description:
            "Tên template workflow (vd: order_processing, refund_approval, inventory_restock)",
        },
        {
          name: "workflow_type",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL",
          enum: ["sequential", "parallel", "conditional"],
          description:
            "Loại workflow (sequential, parallel, conditional) để xác định cách thực thi",
        },
        {
          name: "steps",
          type: "json",
          constraints: "NOT NULL",
          description:
            "Cấu trúc các bước workflow dưới dạng JSON với thứ tự, điều kiện, action",
        },
        {
          name: "trigger_conditions",
          type: "json",
          description: "Điều kiện kích hoạt workflow dưới dạng JSON",
        },
        {
          name: "notification_rules",
          type: "json",
          description:
            "Quy tắc thông báo cho từng bước workflow dưới dạng JSON",
        },
        {
          name: "escalation_rules",
          type: "json",
          description:
            "Quy tắc leo thang khi workflow không hoàn thành đúng hạn",
        },
        {
          name: "is_active",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description: "Trạng thái kích hoạt template (0=vô hiệu, 1=kích hoạt)",
        },
        {
          name: "version",
          type: "varchar",
          length: 10,
          constraints: "DEFAULT '1.0'",
          description: "Phiên bản của template để quản lý thay đổi",
        },
        {
          name: "description",
          type: "varchar",
          length: 500,
          description: "Mô tả mục đích và cách sử dụng workflow template",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời điểm tạo template",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời điểm cập nhật gần nhất",
        },
      ],
      indexes: [
        {
          name: "idx_workflow_templates_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id",
        },
        {
          name: "idx_workflow_templates_template_name",
          columns: ["template_name"],
          unique: true,
          description: "Chỉ mục đảm bảo template_name là duy nhất",
        },
      ],
      foreign_keys: [],
    },
    ui_configurations: {
      description:
        "Bảng cấu hình giao diện người dùng tùy chỉnh theo từng cửa hàng",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Khóa chính tự động tăng",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Mã định danh cửa hàng áp dụng cấu hình UI",
        },
        {
          name: "screen_name",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description:
            "Tên màn hình/module áp dụng cấu hình (vd: pos_screen, dashboard, product_list)",
        },
        {
          name: "component_name",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description:
            "Tên component cụ thể trong màn hình (vd: header, sidebar, product_card)",
        },
        {
          name: "config_type",
          type: "varchar",
          length: 20,
          constraints: "NOT NULL",
          enum: ["layout", "styling", "behavior", "visibility"],
          description:
            "Loại cấu hình (layout, styling, behavior, visibility) để phân loại xử lý",
        },
        {
          name: "config_data",
          type: "json",
          constraints: "NOT NULL",
          description:
            "Dữ liệu cấu hình chi tiết dưới dạng JSON (colors, sizes, positions, etc.)",
        },
        {
          name: "device_type",
          type: "varchar",
          length: 20,
          constraints: "DEFAULT 'all'",
          enum: ["mobile", "tablet", "desktop", "all"],
          description:
            "Loại thiết bị áp dụng (mobile, tablet, desktop, all) cho responsive design",
        },
        {
          name: "user_role",
          type: "varchar",
          length: 20,
          constraints: "DEFAULT 'all'",
          enum: ["admin", "staff", "cashier", "all"],
          description:
            "Role người dùng áp dụng cấu hình (admin, staff, cashier, all)",
        },
        {
          name: "is_active",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description:
            "Trạng thái kích hoạt cấu hình UI (0=vô hiệu, 1=kích hoạt)",
        },
        {
          name: "priority",
          type: "integer",
          constraints: "DEFAULT 0",
          description: "Thứ tự ưu tiên áp dụng khi có nhiều cấu hình conflict",
        },
        {
          name: "description",
          type: "varchar",
          length: 500,
          description: "Mô tả mục đích và tác dụng của cấu hình UI",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời điểm tạo cấu hình",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời điểm cập nhật gần nhất",
        },
      ],
      indexes: [
        {
          name: "idx_ui_configurations_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id",
        },
        {
          name: "idx_ui_configurations_screen_component",
          columns: ["screen_name", "component_name"],
          unique: true,
          description:
            "Chỉ mục đảm bảo cặp screen_name-component_name là duy nhất",
        },
      ],
      foreign_keys: [],
    },
    integration_configs: {
      description: "Bảng lưu trữ cấu hình tích hợp với các hệ thống bên ngoài",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Khóa chính tự động tăng",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Mã định danh cửa hàng sở hữu cấu hình tích hợp",
        },
        {
          name: "integration_name",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description:
            "Tên hệ thống tích hợp (vd: payment_gateway, delivery_service, accounting_system)",
        },
        {
          name: "provider",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description: "Nhà cung cấp dịch vụ (vd: momo, zalopay, grab, shopee)",
        },
        {
          name: "config_data",
          type: "json",
          constraints: "NOT NULL",
          description:
            "Thông tin cấu hình tích hợp dưới dạng JSON (endpoints, credentials, settings)",
        },
        {
          name: "is_encrypted",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description:
            "Flag đánh dấu config_data có được mã hóa hay không (thường là có vì chứa credentials)",
        },
        {
          name: "is_active",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description: "Trạng thái kích hoạt tích hợp (0=vô hiệu, 1=kích hoạt)",
        },
        {
          name: "is_sandbox",
          type: "boolean",
          constraints: "DEFAULT TRUE",
          description:
            "Môi trường tích hợp (0=production, 1=sandbox/test) để phân biệt testing và live",
        },
        {
          name: "webhook_url",
          type: "url",
          description: "URL webhook để nhận callback từ hệ thống bên ngoài",
        },
        {
          name: "webhook_secret",
          type: "varchar",
          length: 100,
          description: "Secret key để verify webhook từ provider",
        },
        {
          name: "rate_limit",
          type: "integer",
          description: "Giới hạn số request per minute đến API bên ngoài",
        },
        {
          name: "timeout",
          type: "integer",
          constraints: "DEFAULT 30",
          description: "Timeout (giây) cho API calls đến hệ thống bên ngoài",
        },
        {
          name: "retry_count",
          type: "integer",
          constraints: "DEFAULT 3",
          description: "Số lần retry khi API call thất bại",
        },
        {
          name: "last_sync",
          type: "timestamp",
          description: "Thời điểm sync dữ liệu gần nhất với hệ thống bên ngoài",
        },
        {
          name: "description",
          type: "varchar",
          length: 500,
          description: "Mô tả mục đích và cách thức tích hợp",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời điểm tạo cấu hình tích hợp",
        },
        {
          name: "updated_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời điểm cập nhật gần nhất",
        },
      ],
      indexes: [
        {
          name: "idx_integration_configs_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id",
        },
        {
          name: "idx_integration_configs_integration_name",
          columns: ["integration_name"],
          unique: true,
          description: "Chỉ mục đảm bảo integration_name là duy nhất",
        },
      ],
      foreign_keys: [],
    },
  },
};
const analisys: DatabaseSchema = {
  version: "v1",
  database_name: "analytics.db",
  description:
    "Tập trung dữ liệu để tạo báo cáo, phân tích và lưu trữ nhật ký kiểm toán (audit trail) cho toàn hệ thống.",
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {
    reports: {
      description: "Lưu trữ thông tin báo cáo và phân tích dữ liệu.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Định danh duy nhất của báo cáo.",
        },
        {
          name: "store_id",
          type: "uuid",
          constraints: "NOT NULL",
          description: "Định danh cửa hàng liên quan đến báo cáo.",
        },
        {
          name: "user_id",
          type: "integer",
          description: "Định danh người dùng tạo báo cáo.",
        },
        {
          name: "report_type",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          enum: ["revenue", "inventory", "customer", "transaction"],
          description: "Loại báo cáo (ví dụ: doanh thu, tồn kho).",
        },
        {
          name: "report_name",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description: "Tên của báo cáo.",
        },
        {
          name: "date_from",
          type: "date",
          constraints: "NOT NULL",
          description: "Ngày bắt đầu của dữ liệu báo cáo.",
        },
        {
          name: "date_to",
          type: "date",
          constraints: "NOT NULL",
          description: "Ngày kết thúc của dữ liệu báo cáo.",
        },
        {
          name: "filters",
          type: "json",
          description: "Bộ lọc áp dụng cho báo cáo.",
        },
        {
          name: "data",
          type: "json",
          description: "Dữ liệu báo cáo ở định dạng JSON hoặc văn bản.",
        },
        {
          name: "file_path",
          type: "varchar",
          length: 255,
          description: "Đường dẫn tới file báo cáo (nếu có).",
        },
        {
          name: "status",
          type: "varchar",
          length: 20,
          constraints: "DEFAULT 'generated'",
          enum: ["generated", "processing", "completed", "failed"],
          description: "Trạng thái của báo cáo.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo báo cáo.",
        },
      ],
      indexes: [
        {
          name: "idx_reports_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id.",
        },
        {
          name: "idx_reports_report_type",
          columns: ["report_type"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo report_type.",
        },
        {
          name: "idx_reports_created_at",
          columns: ["created_at"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo thời gian tạo.",
        },
      ],
      foreign_keys: [],
    },
    audit_logs: {
      description:
        "Lưu trữ nhật ký kiểm toán cho các hành động trong hệ thống.",
      cols: [
        {
          name: "id",
          type: "integer",
          constraints: "PRIMARY KEY AUTO_INCREMENT",
          description: "Định danh duy nhất của bản ghi nhật ký.",
        },
        {
          name: "store_id",
          type: "uuid",
          description: "Định danh cửa hàng liên quan đến hành động.",
        },
        {
          name: "user_id",
          type: "integer",
          description: "Định danh người dùng thực hiện hành động.",
        },
        {
          name: "action",
          type: "varchar",
          length: 50,
          constraints: "NOT NULL",
          enum: ["create", "update", "delete", "view"],
          description: "Hành động được thực hiện (ví dụ: tạo, cập nhật, xóa).",
        },
        {
          name: "table_name",
          type: "varchar",
          length: 100,
          constraints: "NOT NULL",
          description: "Tên bảng bị ảnh hưởng bởi hành động.",
        },
        {
          name: "record_id",
          type: "varchar",
          length: 100,
          description: "Định danh bản ghi bị ảnh hưởng.",
        },
        {
          name: "old_values",
          type: "json",
          description: "Giá trị cũ trước khi thay đổi.",
        },
        {
          name: "new_values",
          type: "json",
          description: "Giá trị mới sau khi thay đổi.",
        },
        {
          name: "ip_address",
          type: "varchar",
          length: 45,
          description: "Địa chỉ IP của người dùng thực hiện hành động.",
        },
        {
          name: "user_agent",
          type: "varchar",
          length: 255,
          description: "Thông tin trình duyệt hoặc thiết bị của người dùng.",
        },
        {
          name: "created_at",
          type: "timestamp",
          constraints: "DEFAULT CURRENT_TIMESTAMP",
          description: "Thời gian tạo nhật ký kiểm toán.",
        },
      ],
      indexes: [
        {
          name: "idx_audit_logs_store_id",
          columns: ["store_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo store_id.",
        },
        {
          name: "idx_audit_logs_user_id",
          columns: ["user_id"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo user_id.",
        },
        {
          name: "idx_audit_logs_table_name",
          columns: ["table_name"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo table_name.",
        },
        {
          name: "idx_audit_logs_created_at",
          columns: ["created_at"],
          unique: false,
          description: "Chỉ mục để tìm kiếm nhanh theo thời gian tạo.",
        },
      ],
      foreign_keys: [],
    },
  },
};

export {
  core,
  oms,
  payment,
  media,
  fnb,
  config,
  analisys,
  scm,
  product,
  inventory,
};
