/**
 * 分析Excel样例文件结构的脚本
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 要分析的文件
const files = [
  {
    type: '汽车',
    path: '/Users/wangpeng/Downloads/0122guanwu/新增测试单据类型/口岸进出口清关/汽车_口岸出口清关/20260106 迪拜海运 比亚迪9 XM20251230123001/合捷汽车箱单发票模板（合捷贸易）-比亚迪9.xls'
  },
  {
    type: '灯具',
    path: '/Users/wangpeng/Downloads/0122guanwu/新增测试单据类型/综保区进出区清关/灯具1-综保区进出清关业务/一线进仓/OAPAC20251205AM 2650354819 泰国海运柜货/2650354819-广东合捷国际供应链有限公司-进口-【欧司朗一线进口-装箱单发票-模板1】-19295-20251231.xls'
  },
  {
    type: '电商',
    path: '/Users/wangpeng/Downloads/0122guanwu/新增测试单据类型/综保区进出区清关/电商-综保区进出清关业务(报关录单资料)/2、一线进口--空运（对应申报：进境备案清单+进口核注清单）/电商--一线空运--进口--荷兰/发票.xlsx'
  }
];

console.log('='.repeat(80));
console.log('Excel文件结构分析');
console.log('='.repeat(80));

files.forEach(({ type, path: filePath }) => {
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`${type}类Excel文件: ${path.basename(filePath)}`);
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(filePath);
    console.log(`\n工作表列表: ${workbook.SheetNames.join(', ')}\n`);

    // 分析前2个sheet
    workbook.SheetNames.slice(0, 2).forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      console.log(`\n--- 工作表: ${sheetName} ---`);
      console.log(`维度: ${jsonData.length}行 x ${jsonData[0]?.length || 0}列\n`);

      // 显示前15行
      console.log('前15行数据:');
      jsonData.slice(0, 15).forEach((row, index) => {
        const rowStr = row.slice(0, 10).map(cell => {
          let str = String(cell || '');
          if (str.length > 20) str = str.substring(0, 20) + '...';
          return str.padEnd(22);
        }).join(' | ');
        console.log(`  行${String(index + 1).padStart(2)}: ${rowStr}`);
      });

      if (jsonData.length > 15) {
        console.log(`  ... (剩余 ${jsonData.length - 15} 行)`);
      }
    });

  } catch (error) {
    console.error(`读取失败: ${error.message}`);
  }
});

console.log('\n\n' + '='.repeat(80));
console.log('分析完成');
console.log('='.repeat(80));
