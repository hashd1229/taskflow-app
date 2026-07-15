import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

const THEMES = { light: "", dark: ".dark" }

const ChartContext = React.createContext(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke=rgba(255,255,255,0.7)]]:stroke-transparent [&_.recharts-dot[stroke=rgba(255,255,255,0.9)]]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke=#ccc]]:stroke-border/50 [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke=#ccc]]:stroke-border [&_.recharts-sector[stroke=#fff]]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }) => {
  const colors = Object.entries(config).filter(
    ([, c]) => c.theme || c.color
  )

  if (!colors.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colors
  .map(([key, itemConfig]) => {
    const color = itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .filter(Boolean)
  .join("\n")}
}
`)
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = ({ active, payload, className, ...props }) => {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  const tooltipLabel = props.label || payload[0]?.payload?.name || ""

  return (
    <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{tooltipLabel}</div>
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${item.name}-${index}`
          const itemConfig = config[item.dataKey || item.name]
          const value =
            item.value !== undefined && item.value !== null
              ? item.value
              : item.payload?.[item.dataKey]

          return (
            <div
              key={key}
              className="flex w-full flex-wrap items-stretch gap-2"
            >
              <div className="flex flex-1 items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />
                  <div className="text-muted-foreground">
                    {item.name || item.dataKey}
                  </div>
                </div>
                <div className="font-mono font-medium tabular-nums text-foreground">
                  {value}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
ChartTooltip.displayName = "ChartTooltip"

const ChartTooltipContent = ChartTooltip

const ChartLegend = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-4",
        className
      )}
      {...props}
    />
  )
}
ChartLegend.displayName = "ChartLegend"

const ChartLegendContent = ({ className, ...props }) => {
  const { config } = useChart()
  const { payload } = props

  if (!payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-4",
        className
      )}
    >
      {payload.map((item, index) => {
        const key = `${item.value}-${index}`
        const itemConfig = config[item.value]

        return (
          <div
            key={key}
            className="flex items-center gap-1.5"
          >
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{
                backgroundColor: item.color,
              }}
            />
            <div className="text-muted-foreground">
              {itemConfig?.label || item.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}
ChartLegendContent.displayName = "ChartLegend"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
