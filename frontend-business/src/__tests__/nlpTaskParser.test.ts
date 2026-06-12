import { parseNaturalLanguageTask } from '../utils/nlpTaskParser'

describe('parseNaturalLanguageTask', () => {
  test('時間を抽出できる', () => {
    const result = parseNaturalLanguageTask('資料作成 30分')
    expect(result.estimated_minutes).toBe(30)
    expect(result.title).toBe('資料作成')
  })
  test('優先度を抽出できる', () => {
    expect(parseNaturalLanguageTask('急ぎ 報告書').priority).toBe('urgent')
    expect(parseNaturalLanguageTask('重要 会議').priority).toBe('high')
  })
  test('今日を解析できる', () => {
    const result = parseNaturalLanguageTask('今日中にレポート')
    const today = new Date().toISOString().split('T')[0]
    expect(result.scheduled_date).toBe(today)
  })
  test('1時間30分を90分に変換', () => {
    expect(parseNaturalLanguageTask('作業 1時間30分').estimated_minutes).toBe(90)
  })
})
