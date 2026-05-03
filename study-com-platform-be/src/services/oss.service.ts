// OSS 服务类
import OSS from "ali-oss";
import path from "path";
import { ossConfig, ossDirectories, isOssConfigured } from "../config/oss";

class OssService {
  private client: OSS | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    if (!isOssConfigured()) {
      console.warn("OSS 配置不完整，将使用本地存储模式");
      return;
    }

    try {
      this.client = new OSS({
        region: ossConfig.region,
        bucket: ossConfig.bucket,
        accessKeyId: ossConfig.accessKeyId,
        accessKeySecret: ossConfig.accessKeySecret,
      });
      console.log("✅ OSS 客户端初始化成功");
    } catch (error) {
      console.error("❌ OSS 客户端初始化失败:", error);
      this.client = null;
    }
  }

  /**
   * 生成唯一文件名
   * @param originalName 原始文件名
   * @param directory 存储目录
   * @returns 唯一文件名
   */
  private generateFileName(originalName: string, directory: string): string {
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext).replace(/\s+/g, "-");
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e6);
    const fileName = `${basename}-${timestamp}-${random}${ext}`;
    return `${directory}${fileName}`;
  }

  /**
   * 上传文件到 OSS
   * @param file 文件对象 (Buffer 或 Stream)
   * @param originalName 原始文件名
   * @param directory 存储目录
   * @returns 上传后的文件 URL
   */
  async uploadFile(
    file: Buffer | NodeJS.ReadableStream,
    originalName: string,
    directory: string = ossDirectories.temp,
  ): Promise<string> {
    if (!this.client) {
      throw new Error("OSS 客户端未初始化");
    }

    const objectName = this.generateFileName(originalName, directory);
    
    try {
      const result = await this.client.put(objectName, file);
      // 使用自定义域名生成访问 URL
      const url = `https://${ossConfig.domain}/${result.name}`;
      return url;
    } catch (error) {
      console.error("OSS 上传文件失败:", error);
      throw error;
    }
  }

  /**
   * 上传 Buffer 到 OSS
   * @param buffer 文件 Buffer
   * @param originalName 原始文件名
   * @param directory 存储目录
   * @returns 上传后的文件 URL
   */
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    directory: string = ossDirectories.temp,
  ): Promise<string> {
    return this.uploadFile(buffer, originalName, directory);
  }

  /**
   * 批量上传文件
   * @param files 文件数组，包含 file (Buffer) 和 originalName
   * @param directory 存储目录
   * @returns 上传后的文件 URL 数组
   */
  async uploadFiles(
    files: { file: Buffer; originalName: string }[],
    directory: string = ossDirectories.temp,
  ): Promise<string[]> {
    const uploadPromises = files.map((f) =>
      this.uploadBuffer(f.file, f.originalName, directory),
    );
    return Promise.all(uploadPromises);
  }

  /**
   * 删除 OSS 上的文件
   * @param url 文件 URL 或 OSS 对象名
   */
  async deleteFile(url: string): Promise<void> {
    if (!this.client) {
      throw new Error("OSS 客户端未初始化");
    }

    try {
      // 从 URL 中提取对象名
      let objectName = url;
      if (url.startsWith("http")) {
        const urlObj = new URL(url);
        // 去掉域名和协议部分
        objectName = urlObj.pathname.slice(1); // 去掉开头的 /
      }

      await this.client.delete(objectName);
      console.log(`✅ OSS 文件已删除: ${objectName}`);
    } catch (error) {
      console.error("OSS 删除文件失败:", error);
      throw error;
    }
  }

  /**
   * 批量删除文件
   * @param urls 文件 URL 数组
   */
  async deleteFiles(urls: string[]): Promise<void> {
    const deletePromises = urls.map((url) => this.deleteFile(url));
    await Promise.all(deletePromises);
  }

  /**
   * 获取文件访问 URL（针对私有 Bucket）
   * @param objectName OSS 对象名
   * @param expires 过期时间（秒）
   * @returns 签名 URL
   */
  getSignedUrl(objectName: string, expires: number = 3600): string {
    if (!this.client) {
      throw new Error("OSS 客户端未初始化");
    }

    return this.client.signatureUrl(objectName, { expires });
  }

  /**
   * 检查 OSS 是否可用
   */
  isAvailable(): boolean {
    return this.client !== null;
  }
}

export const ossService = new OssService();
export default ossService;
