'use client';

import { Card, List, Button, Space, Tag, Modal, message } from 'antd';
import {
  DownloadOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import { useTaskStore } from '@/lib/store';
import { generateDownloadFileName, getFileExtension } from '@/lib/utils';
import JSZip from 'jszip';
import { Material, FileType } from '@/types';

interface DownloadPanelProps {
  taskId: string;
}

// 文件类型标签映射
const fileTypeLabel: Record<FileType, string> = {
  BILL_OF_LADING: '提单',
  INVOICE: '发票',
  PACKING_LIST: '装箱单',
  CONTRACT: '合同',
  CERTIFICATE: '原产地证',
  OTHER: '其他',
};

export function DownloadPanel({ taskId }: DownloadPanelProps) {
  const { tasks } = useTaskStore();
  const task = tasks.find((t) => t.id === taskId);

  const getFileIcon = (fileName: string) => {
    const ext = getFileExtension(fileName);
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
      return <FileImageOutlined className="text-2xl text-green-500" />;
    }
    if (ext === 'pdf') return <FilePdfOutlined className="text-2xl text-red-500" />;
    if (['xls', 'xlsx'].includes(ext)) {
      return <FileExcelOutlined className="text-2xl text-green-600" />;
    }
    return <FileOutlined className="text-2xl text-gray-400" />;
  };

  // 单个文件下载
  const handleSingleDownload = (material: Material) => {
    const link = document.createElement('a');
    link.href = material.fileUrl;
    link.download = generateDownloadFileName(
      material.originalName,
      fileTypeLabel[material.fileType],
      task?.preEntryNo || ''
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(`已下载: ${fileTypeLabel[material.fileType]}_${task?.preEntryNo || ''}`);
  };

  // 批量下载打包
  const handleBatchDownload = async () => {
    if (!task || task.materials.length === 0) {
      message.warning('暂无可下载文件');
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder(`${task.preEntryNo || task.taskNo}_材料文件`);

    for (const material of task.materials) {
      try {
        const response = await fetch(material.fileUrl);
        const blob = await response.blob();
        const newName = generateDownloadFileName(
          material.originalName,
          fileTypeLabel[material.fileType],
          task.preEntryNo || task.taskNo
        );
        folder?.file(newName, blob);
      } catch (error) {
        console.error('下载文件失败:', material.originalName, error);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${task.preEntryNo || task.taskNo}_材料文件.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('批量下载完成');
  };

  return (
    <div className="space-y-4">
      <Card
        title="原始材料文件"
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={handleBatchDownload}
            disabled={!task || task.materials.length === 0}
          >
            批量下载
          </Button>
        }
      >
        {task && task.materials.length > 0 ? (
          <List
            dataSource={task.materials}
            renderItem={(material) => (
              <List.Item
                className="bg-gray-50 rounded-lg px-4"
                actions={[
                  <Button
                    key="download"
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => handleSingleDownload(material)}
                  >
                    下载
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={getFileIcon(material.originalName)}
                  title={
                    <div className="flex items-center gap-2">
                      <span>{material.originalName}</span>
                      <Tag color="blue">{fileTypeLabel[material.fileType]}</Tag>
                    </div>
                  }
                  description={
                    <Space size="middle" className="text-sm">
                      <span>下载后重命名为: {fileTypeLabel[material.fileType]}_{task.preEntryNo || task.taskNo}.{getFileExtension(material.originalName)}</span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <div className="text-center py-8 text-gray-400">
            暂无上传文件
          </div>
        )}
      </Card>

      <Card title="下载说明" size="small">
        <div className="text-sm text-gray-600 space-y-2">
          <p>• 单个文件下载：点击文件右侧的&ldquo;下载&rdquo;按钮</p>
          <p>• 批量下载：点击&ldquo;批量下载&rdquo;按钮，所有文件将打包为 ZIP</p>
          <p>• 文件重命名规则：文件类型_预录入编号.扩展名</p>
          <p>• 示例：提单_ED2025011900001.pdf</p>
        </div>
      </Card>
    </div>
  );
}
