'use client';

import { useState, useCallback } from 'react';
import { Card, Upload, List, Tag, Button, Image, Space, Modal } from 'antd';
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
import { Material } from '@/types';

const { Dragger } = Upload;

interface MaterialUploadProps {
  taskId: string;
}

export function MaterialUpload({ taskId }: MaterialUploadProps) {
  const { tasks, updateTask } = useTaskStore();
  const task = tasks.find((t) => t.id === taskId);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: string } | null>(null);

  const handleUpload = useCallback(
    (file: File) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        message.error(validation.error);
        return false;
      }

      // 创建模拟的文件 URL（实际项目中应该上传到服务器）
      const url = URL.createObjectURL(file);
      const fileType = identifyFileType(file.name);

      const newMaterial: Material = {
        id: crypto.randomUUID(),
        taskId,
        fileType,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: url,
        uploadedAt: new Date(),
      };

      // 更新任务材料列表
      const updatedMaterials = [...(task?.materials || []), newMaterial];
      updateTask(taskId, { materials: updatedMaterials });

      message.success(`${file.name} 上传成功`);
      return false; // 阻止默认上传行为
    },
    [task, taskId, updateTask]
  );

  const handleDelete = (materialId: string) => {
    const updatedMaterials = (task?.materials || []).filter((m) => m.id !== materialId);
    updateTask(taskId, { materials: updatedMaterials });
    message.success('文件已删除');
  };

  const handlePreview = (material: Material) => {
    const ext = material.fileName.split('.').pop()?.toLowerCase();
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
                    avatar={getFileIcon(material.fileName)}
                    title={
                      <div className="flex items-center gap-2">
                        <span>{material.fileName}</span>
                        <Tag color="blue">{material.fileType}</Tag>
                      </div>
                    }
                    description={
                      <Space size="middle">
                        <span>{formatFileSize(material.fileSize)}</span>
                        <span>{new Date(material.uploadedAt).toLocaleString()}</span>
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

// 临时导入 message
import { message } from 'antd';
