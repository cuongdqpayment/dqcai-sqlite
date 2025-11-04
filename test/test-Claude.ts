import {
  DatabaseSchema,
  NodeJSAdapter,
  DatabaseManager,
  BaseService,
  DatabaseFactory,
  ServiceManager,
  UniversalDAO,
  QueryBuilder,
} from "@dqcai/sqlite";

// ============================================
// LOGGER SETUP
// ============================================
import { createModuleLogger, APPModules } from "./logger";
const logger = createModuleLogger(APPModules.TEST_ORM);

// ============================================
// 1. SCHEMA DEFINITION
// ============================================
import { core } from "./schemas.sqlite";

// ============================================
// 2. TYPE DEFINITIONS
// ============================================
interface User {
  id?: number;
  username: string;
  email: string;
  password_hash: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface Post {
  id?: number;
  user_id: number;
  title: string;
  content: string;
  slug?: string;
  status?: "draft" | "published" | "archived";
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface Comment {
  id?: number;
  post_id: number;
  user_id: number;
  content: string;
  parent_id?: number;
  created_at?: string;
  updated_at?: string;
}

interface Tag {
  id?: number;
  name: string;
  slug?: string;
  created_at?: string;
}

interface PostTag {
  id?: number;
  post_id: number;
  tag_id: number;
  created_at?: string;
}

// ============================================
// 3. CUSTOM SERVICES
// ============================================

/**
 * User Service - Quản lý users
 */
class UserService extends BaseService<User> {
  constructor() {
    super("core", "users");
  }

  /**
   * Tìm user theo username
   */
  async findByUsername(username: string): Promise<User | null> {
    logger.debug("Finding user by username", { username });
    const result = await this.dao.getRst(
      `SELECT * FROM ${this.tableName} WHERE username = ? LIMIT 1`,
      [username]
    );
    return result as User | null;
  }

  /**
   * Tìm user theo email
   */
  async findByEmail(email: string): Promise<User | null> {
    logger.debug("Finding user by email", { email });
    const result = await this.dao.getRst(
      `SELECT * FROM ${this.tableName} WHERE email = ? LIMIT 1`,
      [email]
    );
    return result as User | null;
  }

  /**
   * Update profile user
   */
  async updateProfile(
    userId: number,
    profile: Partial<Pick<User, "full_name" | "bio" | "avatar_url">>
  ): Promise<boolean> {
    logger.info("Updating user profile", { userId, profile });
    return await this.update(userId, profile);
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: number): Promise<{
    totalPosts: number;
    totalComments: number;
    joinedDate: string;
  }> {
    logger.debug("Getting user stats", { userId });
    
    const user = await this.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const postCount = await this.dao.getRst(
      "SELECT COUNT(*) as count FROM posts WHERE user_id = ?",
      [userId]
    );

    const commentCount = await this.dao.getRst(
      "SELECT COUNT(*) as count FROM comments WHERE user_id = ?",
      [userId]
    );

    return {
      totalPosts: (postCount?.count as number) || 0,
      totalComments: (commentCount?.count as number) || 0,
      joinedDate: user.created_at || "",
    };
  }
}

/**
 * Post Service - Quản lý posts
 */
class PostService extends BaseService<Post> {
  constructor() {
    super("core", "posts");
  }

  /**
   * Tìm posts theo user
   */
  async findByUser(userId: number, status?: string): Promise<Post[]> {
    logger.debug("Finding posts by user", { userId, status });
    
    let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;
    const params: any[] = [userId];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    sql += " ORDER BY created_at DESC";

    return (await this.dao.getRsts(sql, params)) as Post[];
  }

  /**
   * Tìm post theo slug
   */
  async findBySlug(slug: string): Promise<Post | null> {
    logger.debug("Finding post by slug", { slug });
    const result = await this.dao.getRst(
      `SELECT * FROM ${this.tableName} WHERE slug = ? LIMIT 1`,
      [slug]
    );
    return result as Post | null;
  }

  /**
   * Get published posts
   */
  async getPublishedPosts(limit: number = 10, offset: number = 0): Promise<Post[]> {
    logger.debug("Getting published posts", { limit, offset });
    
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE status = 'published' 
      ORDER BY published_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    return (await this.dao.getRsts(sql, [limit, offset])) as Post[];
  }

  /**
   * Publish post
   */
  async publish(postId: number): Promise<boolean> {
    logger.info("Publishing post", { postId });
    
    return await this.update(postId, {
      status: "published",
      published_at: new Date().toISOString(),
    } as Partial<Post>);
  }

  /**
   * Get post with author info
   */
  async getPostWithAuthor(postId: number): Promise<any> {
    logger.debug("Getting post with author", { postId });
    
    const sql = `
      SELECT 
        p.*,
        u.username,
        u.full_name,
        u.avatar_url
      FROM ${this.tableName} p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
      LIMIT 1
    `;
    
    return await this.dao.getRst(sql, [postId]);
  }

  /**
   * Search posts by title or content
   */
  async searchPosts(keyword: string): Promise<Post[]> {
    logger.debug("Searching posts", { keyword });
    
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE (title LIKE ? OR content LIKE ?)
      AND status = 'published'
      ORDER BY created_at DESC
    `;
    
    const searchPattern = `%${keyword}%`;
    return (await this.dao.getRsts(sql, [searchPattern, searchPattern])) as Post[];
  }
}

/**
 * Comment Service - Quản lý comments
 */
class CommentService extends BaseService<Comment> {
  constructor() {
    super("core", "comments");
  }

  /**
   * Get comments by post
   */
  async findByPost(postId: number): Promise<Comment[]> {
    logger.debug("Finding comments by post", { postId });
    
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE post_id = ?
      ORDER BY created_at ASC
    `;
    
    return (await this.dao.getRsts(sql, [postId])) as Comment[];
  }

  /**
   * Get comments with user info
   */
  async getCommentsWithUser(postId: number): Promise<any[]> {
    logger.debug("Getting comments with user info", { postId });
    
    const sql = `
      SELECT 
        c.*,
        u.username,
        u.full_name,
        u.avatar_url
      FROM ${this.tableName} c
      INNER JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `;
    
    return await this.dao.getRsts(sql, [postId]);
  }

  /**
   * Get reply comments
   */
  async getReplies(parentCommentId: number): Promise<Comment[]> {
    logger.debug("Getting reply comments", { parentCommentId });
    
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE parent_id = ?
      ORDER BY created_at ASC
    `;
    
    return (await this.dao.getRsts(sql, [parentCommentId])) as Comment[];
  }

  /**
   * Count comments by post
   */
  async countByPost(postId: number): Promise<number> {
    logger.debug("Counting comments by post", { postId });
    
    const result = await this.dao.getRst(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE post_id = ?`,
      [postId]
    );
    
    return (result?.count as number) || 0;
  }
}

/**
 * Tag Service - Quản lý tags
 */
class TagService extends BaseService<Tag> {
  constructor() {
    super("core", "tags");
  }

  /**
   * Find or create tag
   */
  async findOrCreate(name: string, slug?: string): Promise<Tag> {
    logger.debug("Find or create tag", { name, slug });
    
    // Try to find existing tag
    const existing = await this.dao.getRst(
      `SELECT * FROM ${this.tableName} WHERE name = ? LIMIT 1`,
      [name]
    );
    
    if (existing) {
      return existing as Tag;
    }
    
    // Create new tag
    const tagSlug = slug || name.toLowerCase().replace(/\s+/g, "-");
    const id = await this.create({
      name,
      slug: tagSlug,
    });
    
    return (await this.findById(id))!;
  }

  /**
   * Get popular tags
   */
  async getPopularTags(limit: number = 10): Promise<any[]> {
    logger.debug("Getting popular tags", { limit });
    
    const sql = `
      SELECT 
        t.*,
        COUNT(pt.post_id) as post_count
      FROM ${this.tableName} t
      LEFT JOIN post_tags pt ON t.id = pt.tag_id
      GROUP BY t.id
      ORDER BY post_count DESC
      LIMIT ?
    `;
    
    return await this.dao.getRsts(sql, [limit]);
  }

  /**
   * Search tags
   */
  async searchTags(keyword: string): Promise<Tag[]> {
    logger.debug("Searching tags", { keyword });
    
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE name LIKE ?
      ORDER BY name ASC
    `;
    
    return (await this.dao.getRsts(sql, [`%${keyword}%`])) as Tag[];
  }
}

/**
 * PostTag Service - Quản lý many-to-many relationship
 */
class PostTagService extends BaseService<PostTag> {
  constructor() {
    super("core", "post_tags");
  }

  /**
   * Add tag to post
   */
  async addTagToPost(postId: number, tagId: number): Promise<number> {
    logger.debug("Adding tag to post", { postId, tagId });
    
    // Check if already exists
    const existing = await this.dao.getRst(
      `SELECT * FROM ${this.tableName} WHERE post_id = ? AND tag_id = ?`,
      [postId, tagId]
    );
    
    if (existing) {
      return (existing as PostTag).id!;
    }
    
    return await this.create({ post_id: postId, tag_id: tagId });
  }

  /**
   * Remove tag from post
   */
  async removeTagFromPost(postId: number, tagId: number): Promise<boolean> {
    logger.debug("Removing tag from post", { postId, tagId });
    
    const result = await this.dao.execute(
      `DELETE FROM ${this.tableName} WHERE post_id = ? AND tag_id = ?`,
      [postId, tagId]
    );
    
    return (result.rowsAffected || 0) > 0;
  }

  /**
   * Get tags by post
   */
  async getTagsByPost(postId: number): Promise<Tag[]> {
    logger.debug("Getting tags by post", { postId });
    
    const sql = `
      SELECT t.*
      FROM tags t
      INNER JOIN ${this.tableName} pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
      ORDER BY t.name ASC
    `;
    
    return (await this.dao.getRsts(sql, [postId])) as Tag[];
  }

  /**
   * Get posts by tag
   */
  async getPostsByTag(tagId: number): Promise<Post[]> {
    logger.debug("Getting posts by tag", { tagId });
    
    const sql = `
      SELECT p.*
      FROM posts p
      INNER JOIN ${this.tableName} pt ON p.id = pt.post_id
      WHERE pt.tag_id = ?
      ORDER BY p.created_at DESC
    `;
    
    return (await this.dao.getRsts(sql, [tagId])) as Post[];
  }

  /**
   * Set tags for post (replace all)
   */
  async setTagsForPost(postId: number, tagIds: number[]): Promise<void> {
    logger.info("Setting tags for post", { postId, tagIds });
    
    // Use transaction
    await this.dao.beginTransaction();
    
    try {
      // Remove all existing tags
      await this.dao.execute(
        `DELETE FROM ${this.tableName} WHERE post_id = ?`,
        [postId]
      );
      
      // Add new tags
      for (const tagId of tagIds) {
        await this.create({ post_id: postId, tag_id: tagId });
      }
      
      await this.dao.commitTransaction();
      logger.info("Tags set successfully", { postId, count: tagIds.length });
    } catch (error) {
      await this.dao.rollbackTransaction();
      logger.error("Failed to set tags", { postId, error });
      throw error;
    }
  }
}

// ============================================
// 4. DATABASE INITIALIZATION
// ============================================
async function initializeDatabase() {
  console.log("🔧 Initializing database...\n");

  try {
    // 1. Register adapter
    const nodeJSAdapter = new NodeJSAdapter();
    DatabaseFactory.registerAdapter(nodeJSAdapter);
    console.log("✓ Adapter registered");

    // 2. Register schema
    DatabaseManager.registerSchema("core", core);
    console.log("✓ Schema registered");

    // 3. Initialize core connection
    await DatabaseManager.initializeCoreConnection();
    console.log("✓ Core connection initialized");

    // 4. Register services with ServiceManager
    console.log("\n🔌 Registering services...");
    const serviceManager = ServiceManager.getInstance();

    serviceManager.registerService({
      schemaName: "core",
      entityName: "users",
      serviceClass: UserService,
      autoInit: true,
    });

    serviceManager.registerService({
      schemaName: "core",
      entityName: "posts",
      serviceClass: PostService,
      autoInit: true,
    });

    serviceManager.registerService({
      schemaName: "core",
      entityName: "comments",
      serviceClass: CommentService,
      autoInit: true,
    });

    serviceManager.registerService({
      schemaName: "core",
      entityName: "tags",
      serviceClass: TagService,
      autoInit: true,
    });

    serviceManager.registerService({
      schemaName: "core",
      entityName: "post_tags",
      serviceClass: PostTagService,
      autoInit: true,
    });

    console.log("✓ All services registered\n");

    // 5. Verify database connection
    const userService = await serviceManager.getService<UserService>(
      "core",
      "users"
    );
    
    console.log("🔍 Verifying database connection...");
    const dao = DatabaseManager.get("core");
    const dbInfo = await dao.getDatabaseInfo();
    console.log("✓ Database connected:", dbInfo.database_name);
    console.log("✓ Database version:", dbInfo.version);
    console.log("✓ Total tables:", dbInfo.table_count);
    console.log();

  } catch (error) {
    console.error("❌ Initialization failed:", error);
    throw error;
  }
}

// ============================================
// 5. USAGE EXAMPLES
// ============================================

/**
 * Example 1: Basic CRUD Operations
 */
async function example1_BasicCRUD() {
  console.log("📝 Example 1: Basic CRUD Operations");
  console.log("─".repeat(50));

  const serviceManager = ServiceManager.getInstance();
  const userService = await serviceManager.getService<UserService>("core", "users");

  // Create
  console.log("\n1️⃣ Creating users...");
  const userId1 = await userService.create({
    username: "john_doe",
    email: "john@example.com",
    password_hash: "hashed_password_123",
    full_name: "John Doe",
    bio: "Software developer and blogger",
  });
  console.log(`✓ Created user: ${userId1}`);

  const userId2 = await userService.create({
    username: "jane_smith",
    email: "jane@example.com",
    password_hash: "hashed_password_456",
    full_name: "Jane Smith",
    bio: "Tech writer and content creator",
  });
  console.log(`✓ Created user: ${userId2}`);

  // Read
  console.log("\n2️⃣ Reading users...");
  const user = await userService.findById(userId1);
  console.log(`✓ Found user:`, { id: user?.id, username: user?.username });

  const userByEmail = await userService.findByEmail("jane@example.com");
  console.log(`✓ Found by email:`, { id: userByEmail?.id, email: userByEmail?.email });

  // Update
  console.log("\n3️⃣ Updating user...");
  await userService.updateProfile(userId1, {
    bio: "Senior Software Developer and Tech Blogger",
    avatar_url: "https://example.com/avatars/john.jpg",
  });
  console.log(`✓ Updated user profile: ${userId1}`);

  // List all
  console.log("\n4️⃣ Listing all users...");
  const allUsers = await userService.findAll();
  console.log(`✓ Total users: ${allUsers.length}`);
  allUsers.forEach((u) => {
    console.log(`   - ${u.username} (${u.email})`);
  });

  console.log();
}

/**
 * Example 2: Working with Posts
 */
async function example2_WorkingWithPosts() {
  console.log("📄 Example 2: Working with Posts");
  console.log("─".repeat(50));

  const serviceManager = ServiceManager.getInstance();
  const userService = await serviceManager.getService<UserService>("core", "users");
  const postService = await serviceManager.getService<PostService>("core", "posts");

  // Get a user
  const user = await userService.findByUsername("john_doe");
  if (!user) {
    console.log("❌ User not found");
    return;
  }

  // Create posts
  console.log("\n1️⃣ Creating posts...");
  const post1Id = await postService.create({
    user_id: user.id!,
    title: "Getting Started with SQLite",
    content: "SQLite is a lightweight database engine...",
    slug: "getting-started-with-sqlite",
    status: "draft",
  });
  console.log(`✓ Created draft post: ${post1Id}`);

  const post2Id = await postService.create({
    user_id: user.id!,
    title: "Advanced SQL Queries",
    content: "Learn how to write complex SQL queries...",
    slug: "advanced-sql-queries",
    status: "draft",
  });
  console.log(`✓ Created draft post: ${post2Id}`);

  // Publish a post
  console.log("\n2️⃣ Publishing post...");
  await postService.publish(post1Id);
  console.log(`✓ Published post: ${post1Id}`);

  // Get published posts
  console.log("\n3️⃣ Getting published posts...");
  const publishedPosts = await postService.getPublishedPosts(10);
  console.log(`✓ Found ${publishedPosts.length} published posts`);
  publishedPosts.forEach((p) => {
    console.log(`   - ${p.title} (${p.status})`);
  });

  // Get post with author
  console.log("\n4️⃣ Getting post with author info...");
  const postWithAuthor = await postService.getPostWithAuthor(post1Id);
  console.log(`✓ Post: "${postWithAuthor.title}"`);
  console.log(`   Author: ${postWithAuthor.full_name} (@${postWithAuthor.username})`);

  // Search posts
  console.log("\n5️⃣ Searching posts...");
  const searchResults = await postService.searchPosts("SQLite");
  console.log(`✓ Found ${searchResults.length} posts matching "SQLite"`);

  console.log();
}

/**
 * Example 3: Tags and Many-to-Many Relationships
 */
async function example3_TagsAndRelationships() {
  console.log("🏷️  Example 3: Tags and Many-to-Many Relationships");
  console.log("─".repeat(50));

  const serviceManager = ServiceManager.getInstance();
  const postService = await serviceManager.getService<PostService>("core", "posts");
  const tagService = await serviceManager.getService<TagService>("core", "tags");
  const postTagService = await serviceManager.getService<PostTagService>("core", "post_tags");

  // Create tags
  console.log("\n1️⃣ Creating tags...");
  const sqliteTag = await tagService.findOrCreate("SQLite", "sqlite");
  const databaseTag = await tagService.findOrCreate("Database", "database");
  const tutorialTag = await tagService.findOrCreate("Tutorial", "tutorial");
  const advancedTag = await tagService.findOrCreate("Advanced", "advanced");
  console.log(`✓ Created/Found ${4} tags`);

  // Get a post
  const post = await postService.findBySlug("getting-started-with-sqlite");
  if (!post) {
    console.log("❌ Post not found");
    return;
  }

  // Add tags to post
  console.log("\n2️⃣ Adding tags to post...");
  await postTagService.addTagToPost(post.id!, sqliteTag.id!);
  await postTagService.addTagToPost(post.id!, databaseTag.id!);
  await postTagService.addTagToPost(post.id!, tutorialTag.id!);
  console.log(`✓ Added tags to post: ${post.title}`);

  // Get tags for post
  console.log("\n3️⃣ Getting tags for post...");
  const tags = await postTagService.getTagsByPost(post.id!);
  console.log(`✓ Post "${post.title}" has ${tags.length} tags:`);
  tags.forEach((tag) => {
    console.log(`   - ${tag.name}`);
  });

  // Get posts by tag
  console.log("\n4️⃣ Getting posts by tag...");
  const postsWithSQLiteTag = await postTagService.getPostsByTag(sqliteTag.id!);
  console.log(`✓ Found ${postsWithSQLiteTag.length} posts with "SQLite" tag`);

  // Get popular tags
  console.log("\n5️⃣ Getting popular tags...");
  const popularTags = await tagService.getPopularTags(5);
  console.log(`✓ Top 5 popular tags:`);
  popularTags.forEach((tag) => {
    console.log(`   - ${tag.name} (${tag.post_count} posts)`);
  });

  // Set multiple tags at once
  console.log("\n6️⃣ Setting multiple tags...");
  const post2 = await postService.findBySlug("advanced-sql-queries");
  if (post2) {
    await postTagService.setTagsForPost(post2.id!, [
      sqliteTag.id!,
      databaseTag.id!,
      advancedTag.id!,
    ]);
    console.log(`✓ Set tags for post: ${post2.title}`);
  }

  console.log();
}

/**
 * Example 4: Comments and Nested Comments
 */
async function example4_CommentsAndReplies() {
  console.log("💬 Example 4: Comments and Nested Comments");
  console.log("─".repeat(50));

  const serviceManager = ServiceManager.getInstance();
  const userService = await serviceManager.getService<UserService>("core", "users");
  const postService = await serviceManager.getService<PostService>("core", "posts");
  const commentService = await serviceManager.getService<CommentService>("core", "comments");

  // Get users and post
  const john = await userService.findByUsername("john_doe");
  const jane = await userService.findByUsername("jane_smith");
  const post = await postService.findBySlug("getting-started-with-sqlite");

  if (!john || !jane || !post) {
    console.log("❌ Required data not found");
    return;
  }

  // Add comments
  console.log("\n1️⃣ Adding comments...");
  const comment1Id = await commentService.create({
    post_id: post.id!,
    user_id: jane.id!,
    content: "Great tutorial! Very helpful for beginners.",
  });
  console.log(`✓ Added comment: ${comment1Id}`);

  const comment2Id = await commentService.create({
    post_id: post.id!,
    user_id: john.id!,
    content: "Thanks! Glad you found it useful.",
    parent_id: comment1Id,
  });
  console.log(`✓ Added reply: ${comment2Id}`);

  const comment3Id = await commentService.create({
    post_id: post.id!,
    user_id: jane.id!,
    content: "Could you cover transactions in the next post?",
  });
  console.log(`✓ Added comment: ${comment3Id}`);

  // Get comments with user info
  console.log("\n2️⃣ Getting comments with user info...");
  const commentsWithUser = await commentService.getCommentsWithUser(post.id!);
  console.log(`✓ Found ${commentsWithUser.length} comments:`);
  commentsWithUser.forEach((c) => {
    const prefix = c.parent_id ? "   └─ Reply:" : "   ─";
    console.log(`${prefix} ${c.full_name}: "${c.content.substring(0, 50)}..."`);
  });

  // Get replies
  console.log("\n3️⃣ Getting replies...");
  const replies = await commentService.getReplies(comment1Id);
  console.log(`✓ Found ${replies.length} replies to comment ${comment1Id}`);

  // Count comments
  console.log("\n4️⃣ Counting comments...");
  const commentCount = await commentService.countByPost(post.id!);
  console.log(`✓ Post has ${commentCount} total comments`);

  console.log();
}

/**
 * Example 5: User Statistics
 */
async function example5_UserStatistics() {
  console.log("📊 Example 5: User Statistics");
  console.log("─".repeat(50));

  const serviceManager = ServiceManager.getInstance();
  const userService = await serviceManager.getService<UserService>("core", "users");

  console.log("\n1️⃣ Getting user statistics...");
  const users = await userService.findAll();

  for (const user of users) {
    const stats = await userService.getUserStats(user.id!);
    console.log(`\n👤 ${user.full_name} (@${user.username}):`);
    console.log(`   Posts: ${stats.totalPosts}`);
    console.log(`   Comments: ${stats.totalComments}`);
    console.log(`   Joined: ${new Date(stats.joinedDate).toLocaleDateString()}`);
  }

  console.log();
}

/**
 * Example 6: Transaction Example
 */
async function example6_TransactionExample() {
  console.log("🔄 Example 6: Transaction Example");
  console.log("─".repeat(50));

  const serviceManager = ServiceManager.getInstance();
  const userService = await serviceManager.getService<UserService>("core", "users");
  const postService = await serviceManager.getService<PostService>("core", "posts");
  const tagService = await serviceManager.getService<TagService>("core", "tags");
  const postTagService = await serviceManager.getService<PostTagService>("core", "post_tags");

  console.log("\n1️⃣ Creating post with tags in transaction...");

  const dao = DatabaseManager.get("core");
  await dao.beginTransaction();

  try {
    // Create user
    const userId = await userService.create({
      username: "bob_wilson",
      email: "bob@example.com",
      password_hash: "hashed_password_789",
      full_name: "Bob Wilson",
    });
    console.log(`✓ Created user: ${userId}`);

    // Create post
    const postId = await postService.create({
      user_id: userId,
      title: "Understanding Database Transactions",
      content: "Transactions ensure data integrity...",
      slug: "understanding-database-transactions",
      status: "published",
      published_at: new Date().toISOString(),
    });
    console.log(`✓ Created post: ${postId}`);

    // Create and assign tags
    const tag1 = await tagService.findOrCreate("Transactions");
    const tag2 = await tagService.findOrCreate("Best Practices");
    await postTagService.addTagToPost(postId, tag1.id!);
    await postTagService.addTagToPost(postId, tag2.id!);
    console.log(`✓ Added tags to post`);

    // Commit transaction
    await dao.commitTransaction();
    console.log(`✓ Transaction committed successfully`);
  } catch (error) {
    await dao.rollbackTransaction();
    console.error("❌ Transaction failed, rolled back:", error);
    throw error;
  }

  console.log();
}

/**
 * Example 7: Advanced Queries with QueryBuilder
 */
async function example7_AdvancedQueries() {
  console.log("🔍 Example 7: Advanced Queries with QueryBuilder");
  console.log("─".repeat(50));

  const dao = DatabaseManager.get("core");

  console.log("\n1️⃣ Complex JOIN query...");
  const postsWithDetails = await dao.getRsts(`
    SELECT 
      p.id,
      p.title,
      p.status,
      u.username as author,
      COUNT(DISTINCT c.id) as comment_count,
      COUNT(DISTINCT pt.tag_id) as tag_count
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
    LEFT JOIN comments c ON p.id = c.post_id
    LEFT JOIN post_tags pt ON p.id = pt.post_id
    GROUP BY p.id, p.title, p.status, u.username
    ORDER BY p.created_at DESC
  `);

  console.log(`✓ Found ${postsWithDetails.length} posts with details:`);
  postsWithDetails.forEach((post: any) => {
    console.log(`   - "${post.title}" by @${post.author}`);
    console.log(`     Comments: ${post.comment_count}, Tags: ${post.tag_count}`);
  });

  console.log("\n2️⃣ Aggregation query...");
  const userActivity = await dao.getRsts(`
    SELECT 
      u.username,
      u.full_name,
      COUNT(DISTINCT p.id) as total_posts,
      COUNT(DISTINCT c.id) as total_comments,
      MAX(p.created_at) as last_post_date
    FROM users u
    LEFT JOIN posts p ON u.id = p.user_id
    LEFT JOIN comments c ON u.id = c.user_id
    GROUP BY u.id, u.username, u.full_name
    HAVING total_posts > 0 OR total_comments > 0
    ORDER BY total_posts DESC, total_comments DESC
  `);

  console.log(`✓ User activity report:`);
  userActivity.forEach((user: any) => {
    console.log(`   ${user.full_name} (@${user.username}):`);
    console.log(`   - Posts: ${user.total_posts}, Comments: ${user.total_comments}`);
  });

  console.log();
}

/**
 * Example 8: Batch Operations
 */
async function example8_BatchOperations() {
  console.log("⚡ Example 8: Batch Operations");
  console.log("─".repeat(50));

  const serviceManager = ServiceManager.getInstance();
  const userService = await serviceManager.getService<UserService>("core", "users");
  const postService = await serviceManager.getService<PostService>("core", "posts");

  console.log("\n1️⃣ Creating multiple users in batch...");
  const dao = DatabaseManager.get("core");
  await dao.beginTransaction();

  try {
    const userIds: number[] = [];
    const users = [
      {
        username: "alice_brown",
        email: "alice@example.com",
        password_hash: "hash1",
        full_name: "Alice Brown",
      },
      {
        username: "charlie_white",
        email: "charlie@example.com",
        password_hash: "hash2",
        full_name: "Charlie White",
      },
      {
        username: "diana_green",
        email: "diana@example.com",
        password_hash: "hash3",
        full_name: "Diana Green",
      },
    ];

    for (const user of users) {
      const id = await userService.create(user);
      userIds.push(id);
    }

    await dao.commitTransaction();
    console.log(`✓ Created ${userIds.length} users in batch`);
  } catch (error) {
    await dao.rollbackTransaction();
    console.error("❌ Batch operation failed:", error);
  }

  console.log("\n2️⃣ Bulk update example...");
  await dao.execute(
    `UPDATE users SET bio = ? WHERE created_at > datetime('now', '-1 hour')`,
    ["New user - Welcome to our blog!"]
  );
  console.log(`✓ Updated bio for recent users`);

  console.log();
}

/**
 * Example 9: Data Validation and Error Handling
 */
async function example9_ValidationAndErrorHandling() {
  console.log("✅ Example 9: Data Validation and Error Handling");
  console.log("─".repeat(50));

  const serviceManager = ServiceManager.getInstance();
  const userService = await serviceManager.getService<UserService>("core", "users");
  const postService = await serviceManager.getService<PostService>("core", "posts");

  console.log("\n1️⃣ Testing duplicate username...");
  try {
    await userService.create({
      username: "john_doe", // Already exists
      email: "newemail@example.com",
      password_hash: "hash",
      full_name: "New User",
    });
    console.log("❌ Should have failed!");
  } catch (error) {
    console.log(`✓ Caught duplicate error: ${(error as Error).message.substring(0, 50)}...`);
  }

  console.log("\n2️⃣ Testing invalid foreign key...");
  try {
    await postService.create({
      user_id: 99999, // Non-existent user
      title: "Test Post",
      content: "Content",
      slug: "test-post",
    });
    console.log("❌ Should have failed!");
  } catch (error) {
    console.log(`✓ Caught foreign key error: ${(error as Error).message.substring(0, 50)}...`);
  }

  console.log("\n3️⃣ Testing not found scenario...");
  const nonExistentUser = await userService.findById(99999);
  if (!nonExistentUser) {
    console.log("✓ Correctly returned null for non-existent user");
  }

  console.log();
}

/**
 * Example 10: Performance Testing
 */
async function example10_PerformanceTesting() {
  console.log("⚡ Example 10: Performance Testing");
  console.log("─".repeat(50));

  const serviceManager = ServiceManager.getInstance();
  const postService = await serviceManager.getService<PostService>("core", "posts");
  const dao = DatabaseManager.get("core");

  console.log("\n1️⃣ Testing query performance...");
  
  // Test 1: Simple SELECT
  const start1 = Date.now();
  await postService.findAll();
  const time1 = Date.now() - start1;
  console.log(`✓ Simple SELECT: ${time1}ms`);

  // Test 2: Complex JOIN
  const start2 = Date.now();
  await dao.getRsts(`
    SELECT p.*, u.username, COUNT(c.id) as comment_count
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
    LEFT JOIN comments c ON p.id = c.post_id
    GROUP BY p.id
  `);
  const time2 = Date.now() - start2;
  console.log(`✓ Complex JOIN: ${time2}ms`);

  // Test 3: Transaction
  const start3 = Date.now();
  await dao.beginTransaction();
  const user = await serviceManager.getService<UserService>("core", "users")
    .findByUsername("john_doe");
  if (user) {
    await postService.findByUser(user.id!);
  }
  await dao.commitTransaction();
  const time3 = Date.now() - start3;
  console.log(`✓ Transaction: ${time3}ms`);

  console.log();
}

/**
 * Example 11: Database Maintenance
 */
async function example11_DatabaseMaintenance() {
  console.log("🔧 Example 11: Database Maintenance");
  console.log("─".repeat(50));

  const dao = DatabaseManager.get("core");

  console.log("\n1️⃣ Getting database info...");
  const dbInfo = await dao.getDatabaseInfo();
  console.log(`✓ Database: ${dbInfo.database_name}`);
  console.log(`✓ Version: ${dbInfo.version}`);
  console.log(`✓ Tables: ${dbInfo.table_count}`);

  console.log("\n2️⃣ Checking table info...");
  const userTableInfo = await dao.getTableInfo("users");
  console.log(`✓ Users table has ${userTableInfo.length} columns:`);
  userTableInfo.forEach((col: any) => {
    console.log(`   - ${col.name} (${col.type})`);
  });

  console.log("\n3️⃣ Getting schema version...");
  const schemaVersion = await dao.getSchemaVersion();
  console.log(`✓ Schema version: ${schemaVersion}`);

  console.log("\n4️⃣ Analyzing database...");
  await dao.execute("ANALYZE");
  console.log(`✓ Database analyzed for query optimization`);

  console.log("\n5️⃣ Vacuum database...");
  await dao.execute("VACUUM");
  console.log(`✓ Database vacuumed (reclaimed unused space)`);

  console.log();
}

/**
 * Example 12: Export and Reporting
 */
async function example12_ExportAndReporting() {
  console.log("📈 Example 12: Export and Reporting");
  console.log("─".repeat(50));

  const dao = DatabaseManager.get("core");

  console.log("\n1️⃣ Generating blog statistics report...");
  const stats = await dao.getRst(`
    SELECT 
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM posts) as total_posts,
      (SELECT COUNT(*) FROM posts WHERE status = 'published') as published_posts,
      (SELECT COUNT(*) FROM comments) as total_comments,
      (SELECT COUNT(*) FROM tags) as total_tags
  `);

  console.log(`\n📊 Blog Statistics Report`);
  console.log(`─`.repeat(40));
  console.log(`Total Users:      ${stats?.total_users || 0}`);
  console.log(`Total Posts:      ${stats?.total_posts || 0}`);
  console.log(`Published Posts:  ${stats?.published_posts || 0}`);
  console.log(`Total Comments:   ${stats?.total_comments || 0}`);
  console.log(`Total Tags:       ${stats?.total_tags || 0}`);

  console.log("\n2️⃣ Most active users...");
  const activeUsers = await dao.getRsts(`
    SELECT 
      u.username,
      u.full_name,
      COUNT(DISTINCT p.id) as post_count,
      COUNT(DISTINCT c.id) as comment_count,
      (COUNT(DISTINCT p.id) + COUNT(DISTINCT c.id)) as total_activity
    FROM users u
    LEFT JOIN posts p ON u.id = p.user_id
    LEFT JOIN comments c ON u.id = c.user_id
    GROUP BY u.id
    ORDER BY total_activity DESC
    LIMIT 5
  `);

  console.log(`\n👥 Top 5 Most Active Users`);
  console.log(`─`.repeat(40));
  activeUsers.forEach((user: any, index: number) => {
    console.log(`${index + 1}. ${user.full_name} (@${user.username})`);
    console.log(`   Posts: ${user.post_count}, Comments: ${user.comment_count}`);
  });

  console.log("\n3️⃣ Most popular tags...");
  const popularTags = await dao.getRsts(`
    SELECT 
      t.name,
      COUNT(pt.post_id) as usage_count
    FROM tags t
    LEFT JOIN post_tags pt ON t.id = pt.tag_id
    GROUP BY t.id
    HAVING usage_count > 0
    ORDER BY usage_count DESC
    LIMIT 5
  `);

  console.log(`\n🏷️  Top 5 Most Used Tags`);
  console.log(`─`.repeat(40));
  popularTags.forEach((tag: any, index: number) => {
    console.log(`${index + 1}. ${tag.name} (used in ${tag.usage_count} posts)`);
  });

  console.log();
}

// ============================================
// MAIN EXECUTION
// ============================================
async function main() {
  try {
    console.log("╔═══════════════════════════════════════════════════════╗");
    console.log("║     @dqcai/sqlite Blog Application - Full Demo        ║");
    console.log("║     Node.js with DatabaseManager & Services           ║");
    console.log("╚═══════════════════════════════════════════════════════╝\n");

    // Initialize database and services
    await initializeDatabase();

    // Run all examples
    console.log("🚀 Running examples...\n");
    console.log("═".repeat(60));

    await example1_BasicCRUD();
    await example2_WorkingWithPosts();
    await example3_TagsAndRelationships();
    await example4_CommentsAndReplies();
    await example5_UserStatistics();
    await example6_TransactionExample();
    await example7_AdvancedQueries();
    await example8_BatchOperations();
    await example9_ValidationAndErrorHandling();
    await example10_PerformanceTesting();
    await example11_DatabaseMaintenance();
    await example12_ExportAndReporting();

    console.log("═".repeat(60));
    console.log("\n✅ All examples completed successfully!\n");

  } catch (error) {
    console.error("\n❌ Error occurred:", error);
    throw error;
  } finally {
    // Cleanup
    console.log("🧹 Cleaning up resources...");
    try {
      await ServiceManager.getInstance().destroy();
      await DatabaseManager.closeAll();
      console.log("✓ Cleanup complete\n");
    } catch (error) {
      console.error("⚠️  Cleanup warning:", error);
    }
  }
}

// ============================================
// RUN APPLICATION
// ============================================
if (require.main === module) {
  main()
    .then(() => {
      console.log("👋 Application finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Fatal error:", error);
      process.exit(1);
    });
}

// Export for testing
export {
  UserService,
  PostService,
  CommentService,
  TagService,
  PostTagService,
  initializeDatabase,
};

// ============================================
// ADDITIONAL UTILITIES
// ============================================

/**
 * Quick test function for development
 */
export async function quickTest() {
  console.log("🧪 Running quick test...\n");
  
  await initializeDatabase();
  
  const serviceManager = ServiceManager.getInstance();
  const userService = await serviceManager.getService<UserService>("core", "users");
  
  // Create test user
  const userId = await userService.create({
    username: "test_user",
    email: "test@test.com",
    password_hash: "test_hash",
    full_name: "Test User",
  });
  
  console.log(`✓ Created test user with ID: ${userId}`);
  
  const user = await userService.findById(userId);
  console.log(`✓ Retrieved user:`, user);
  
  // Cleanup
  await userService.delete(userId);
  console.log(`✓ Deleted test user`);
  
  await ServiceManager.getInstance().destroy();
  await DatabaseManager.closeAll();
  
  console.log("\n✅ Quick test completed!\n");
}

/**
 * Reset database (for development)
 */
export async function resetDatabase() {
  console.log("⚠️  Resetting database...\n");
  
  const dao = DatabaseManager.get("core");
  
  await dao.beginTransaction();
  try {
    await dao.execute("DELETE FROM post_tags");
    await dao.execute("DELETE FROM comments");
    await dao.execute("DELETE FROM posts");
    await dao.execute("DELETE FROM tags");
    await dao.execute("DELETE FROM users");
    
    await dao.commitTransaction();
    console.log("✓ Database reset complete\n");
  } catch (error) {
    await dao.rollbackTransaction();
    console.error("❌ Failed to reset database:", error);
    throw error;
  }
}