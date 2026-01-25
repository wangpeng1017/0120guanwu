/**
 * @file route.ts
 * @desc 委托书生成API
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseExcelFile } from '@/lib/delegation/parser'
import { extractDataFromFile } from '@/lib/delegation/extractor'
import { mergeExcelData } from '@/lib/delegation/merger'
import { mapDelegationData } from '@/lib/delegation/mapper'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '未上传文件' },
        { status: 400 }
      )
    }

    const XLSX = require('xlsx')
    const filesData = []

    // 处理每个文件
    for (const file of files) {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'buffer' })

      // 1. 识别Sheet类型
      const parsedFile = parseExcelFile(file.name, workbook)

      // 2. 提取数据
      const extractedData = extractDataFromFile(workbook, parsedFile)

      filesData.push({
        fileName: file.name,
        data: extractedData
      })
    }

    // 3. 合并数据
    const mergedData = mergeExcelData(filesData)

    // 4. 映射到委托书和委托协议
    const result = mapDelegationData(mergedData)

    return NextResponse.json(result)
  } catch (error) {
    console.error('处理失败:', error)
    return NextResponse.json(
      { error: '处理失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
