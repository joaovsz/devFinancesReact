import * as echarts from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { LineChart } from "echarts/charts"
import {
  GridComponent,
  TooltipComponent,
  LegendComponent
} from "echarts/components"

echarts.use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

export { echarts }
