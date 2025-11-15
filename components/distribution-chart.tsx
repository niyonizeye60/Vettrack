import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { useLanguage } from "@/contexts/LanguageContext"

interface DistributionChartProps {
  pieData: Array<{ name: string; value: number; color: string }>
  data: Array<{ bpm: number; temperature: number | null }>
}

export function DistributionChart({ pieData, data }: DistributionChartProps) {
  const { t } = useLanguage()
  // Create BPM range data for bar chart
  const bpmRanges = [
    { range: "0-60", min: 0, max: 60, color: "#3B82F6" },
    { range: "61-80", min: 61, max: 80, color: "#10B981" },
    { range: "81-100", min: 81, max: 100, color: "#10B981" },
    { range: "101-130", min: 101, max: 130, color: "#F59E0B" },
    { range: "131+", min: 131, max: 999, color: "#EF4444" },
  ]

  const barData = bpmRanges.map((range) => ({
    range: range.range,
    count: data.filter((item) => item.bpm >= range.min && item.bpm <= range.max).length,
    color: range.color,
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`${label} BPM`}</p>
          <p className="text-blue-600">{`${t('farmer.count')}: ${payload[0].value} ${t('farmer.readings')}`}</p>
          <p className="text-gray-500 text-sm">{`${((payload[0].value / data.length) * 100).toFixed(1)}% ${t('farmer.ofTotal')}`}</p>
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.name}</p>
          <p className="text-blue-600">{`${data.value} ${t('farmer.readings')}`}</p>
          <p className="text-gray-500 text-sm">
            {`${((data.value / pieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%`}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Pie Chart */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">{t('farmer.healthStatusDistribution')}</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex justify-center items-center h-64 text-gray-400">{t('farmer.noDataAvailableChart')}</div>
        )}
      </div>

      {/* Bar Chart */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">{t('farmer.bpmRangeDistribution')}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="range" tick={{ fontSize: 12 }} axisLine={{ stroke: "#d1d5db" }} />
            <YAxis
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: "#d1d5db" }}
              label={{ value: t('farmer.count'), angle: -90, position: "insideLeft" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} stroke="#ffffff" strokeWidth={1}>
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {pieData.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-lg p-4 border-l-4 shadow-sm"
            style={{ borderLeftColor: item.color }}
          >
            <div className="text-2xl font-bold text-gray-800">{item.value}</div>
            <div className="text-sm text-gray-600">{item.name} {t('farmer.readings')}</div>
            <div className="text-xs text-gray-500 mt-1">
              {((item.value / pieData.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
