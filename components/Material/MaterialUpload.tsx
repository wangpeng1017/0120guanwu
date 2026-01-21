'use client';

import { useState, useCallback } from 'react';
import { Card, Upload, List, Tag, Button, Image, Space, Modal, message } from 'antd';
import {
  InboxOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FileZipOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useTaskStore } from '@/lib/store';
import { formatFileSize, identifyFileType, validateFile } from '@/lib/utils';
import { Material, FileType } from '@/types';

const { Dragger } = Upload;

interface MaterialUploadProps {
  taskId: string;
}

// 将字符串类型转换为 FileType 枚举
function toFileType(type: string): FileType {
  const typeMap: Record<string, FileType> = {
    '提单': 'BILL_OF_LADING',
    '发票': 'INVOICE',
    '装箱单': 'PACKING_LIST',
    '合同': 'CONTRACT',
    '原产地证': 'CERTIFICATE',
  };
  return typeMap[type] || 'OTHER';
}

export function MaterialUpload({ taskId }: MaterialUploadProps) {
  const { tasks, updateTask } = useTaskStore();
  const task = tasks.find((t) => t.id === taskId);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: string } | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      console.log('[上传] 开始上传文件:', file.name, file.size, file.type);
      
      const validation = validateFile(file);
      console.log('[上传] 验证结果:', validation);
      if (!validation.valid) {
        message.error(validation.error);
        return false;
      }

      try {
        console.log('[上传] 准备发送请求, taskId:', taskId);
        // 上传到服务器
        const formData = new FormData();
        formData.append('file', file);
        formData.append('taskId', taskId);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        console.log('[上传] 服务器响应:', result);

        if (!result.success) {
          message.error(result.error || '上传失败');
          return false;
        }

        // 刷新任务列表
        console.log('[上传] 开始刷新任务...');
        const tasksResponse = await fetch(`/api/tasks/${taskId}`);
        const taskData = await tasksResponse.json();
        console.log('[上传] 任务数据:', taskData);

        if (taskData.success) {
          console.log('[上传] 更新 store, materials:', taskData.task?.materials);
          updateTask(taskId, taskData.task);
        }

        message.success(`${file.name} 上传成功`);
      } catch (error) {
        console.error('上传失败:', error);
        message.error('上传失败，请重试');
      }

      return false; // 阻止默认上传行为
    },
    [task, taskId, updateTask]
  );

  const handleDelete = async (materialId: string) => {
    try {
      const response = await fetch(`/api/upload?id=${materialId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // 刷新任务列表
        console.log('[上传] 开始刷新任务...');
        const tasksResponse = await fetch(`/api/tasks/${taskId}`);
        const taskData = await tasksResponse.json();
        console.log('[上传] 任务数据:', taskData);

        if (taskData.success) {
          console.log('[上传] 更新 store, materials:', taskData.task?.materials);
          updateTask(taskId, taskData.task);
        }

        message.success('文件已删除');
      } else {
        message.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败，请重试');
    }
  };

  const handlePreview = (material: Material) => {
    const ext = material.originalName.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '');

    setPreviewFile({
      url: material.fileUrl,
      type: isImage ? 'image' : 'file',
    });
    setPreviewVisible(true);
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.tiff,.zip,.rar',
    beforeUpload: handleUpload,
    showUploadList: false,
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconProps = { className: 'text-2xl text-gray-400' };

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) {
      return <FileImageOutlined {...iconProps} className="text-2xl text-green-500" />;
    }
    if (ext === 'pdf') return <FilePdfOutlined {...iconProps} className="text-2xl text-red-500" />;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
      return <FileExcelOutlined {...iconProps} className="text-2xl text-green-600" />;
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return <FileWordOutlined {...iconProps} className="text-2xl text-blue-500" />;
    }
    if (['zip', 'rar'].includes(ext || '')) {
      return <FileZipOutlined {...iconProps} className="text-2xl text-orange-500" />;
    }
    return <FileOutlined {...iconProps} />;
  };

  // 文件类型标签映射
  const fileTypeLabel: Record<FileType, string> = {
    BILL_OF_LADING: '提单',
    INVOICE: '发票',
    PACKING_LIST: '装箱单',
    CONTRACT: '合同',
    CERTIFICATE: '原产地证',
    OTHER: '其他',
  };

  return (
    <Card title="上传材料">
      <Space direction="vertical" size="large" className="w-full">
        <Dragger {...uploadProps} className="upload-drag-area">
          <p className="ant-upload-drag-icon">
            <InboxOutlined className="text-5xl text-gray-400" />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 PDF、Word、Excel、图片等格式，单个文件不超过 50MB
          </p>
        </Dragger>

        {task?.materials && task.materials.length > 0 && (
          <div>
            <h3 className="text-base font-medium mb-3">已上传文件</h3>
            <List
              dataSource={task.materials}
              renderItem={(material) => (
                <List.Item
                  className="bg-gray-50 rounded-lg px-4"
                  actions={[
                    <Button
                      key="preview"
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handlePreview(material)}
                    >
                      预览
                    </Button>,
                    <Button
                      key="delete"
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(material.id)}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={getFileIcon(material.originalName)}
                    title={
                      <div className="flex items-center gap-2">
                        <span>{material.originalName}</span>
                        <Tag color="blue">{fileTypeLabel[material.fileType] || material.fileType}</Tag>
                      </div>
                    }
                    description={
                      <Space size="middle">
                        <span>{formatFileSize(material.fileSize)}</span>
                        <span>{new Date(material.createdAt).toLocaleString()}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Space>

      <Modal
        open={previewVisible}
        title="文件预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        {previewFile?.type === 'image' ? (
          <Image src={previewFile.url} alt="预览" className="w-full" />
        ) : (
          <div className="text-center py-8">
            <FileOutlined className="text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500">此文件类型不支持预览</p>
          </div>
        )}
      </Modal>
    </Card>
  );
}
