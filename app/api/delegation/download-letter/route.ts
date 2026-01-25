/**
 * @file route.ts
 * @desc 委托书下载API
 */

import { NextRequest, NextResponse } from 'next/server'
import { exportDelegationLetterToExcel } from '@/lib/delegation/excel-exporter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body || !body.delegationLetter) {
      return NextResponse.json(
        { error: '缺少委托书数据' },
        { status: 400 }
      )
    }

    const buffer = exportDelegationLetterToExcel(body.delegationLetter)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="delegation-letter-${Date.now()}.xlsx"`
      }
    })
  } catch (error) {
    console.error('导出失败:', error)
    return NextResponse.json(
      { error: '导出失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
