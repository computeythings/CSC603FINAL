"use client"
import React from 'react'
import { Area, AreaChart, Bar, BarChart, XAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const graphData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
  { month: "July", desktop: 186 },
  { month: "August", desktop: 305 },
  { month: "September", desktop: 237 },
  { month: "October", desktop: 73 },
  { month: "November", desktop: 209 },
  { month: "December", desktop: 214 },
]

const graphConfig = {
  desktop: {
    label: "Customers",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
  { month: "July", desktop: 186 },
  { month: "August", desktop: 305 },
  { month: "September", desktop: 237 },
  { month: "October", desktop: 73 },
  { month: "November", desktop: 209 },
  { month: "December", desktop: 214 },
]

const chartConfig = {
  desktop: {
    label: "$ USD",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig

const Dashboard: React.FC = () => {
    return (
      <div>
        <h1 className='text-4xl font-bold text-center'>Company name</h1>
        <div className="grid grid-cols-6 gap-x-8 gap-y-16 m-12 content-between">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
            </CardHeader>
            <CardContent className="font-semibold text-lg leading-none sm:text-3xl">
              <p>$69,420</p>
            </CardContent>
            <CardFooter>
              <p>+112% since last month</p>
            </CardFooter>
          </Card>
          <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Sales</CardTitle>
            </CardHeader>
            <CardContent className="font-semibold text-lg leading-none sm:text-3xl">
              <p>14,223</p>
            </CardContent>
            <CardFooter>
              <p>+86% since last month</p>
            </CardFooter>
          </Card>
          <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Customers</CardTitle>
            </CardHeader>
            <CardContent className="font-semibold text-lg leading-none sm:text-3xl">
              <p>872</p>
            </CardContent>
            <CardFooter>
              <p>+31 since last month</p>
            </CardFooter>
          </Card>
          <Card className="col-span-3 max-w-[40vw]">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
            <ChartContainer config={chartConfig}>
              <BarChart accessibilityLayer data={chartData}>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="desktop" fill="var(--color-desktop)" radius={8} />
              </BarChart>
            </ChartContainer>
          </Card>
          <Card className="col-span-3 max-w-[40vw]">
            <CardHeader>
              <CardTitle>Customers</CardTitle>
            </CardHeader>
            <ChartContainer config={graphConfig}>
              <AreaChart
                accessibilityLayer
                data={graphData}
                margin={{
                  left: 18,
                  right: 18
                }}
              >
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="desktop"
                  type="natural"
                  fill="var(--color-desktop)"
                  fillOpacity={0.4}
                  stroke="var(--color-desktop)"
                />
              </AreaChart>
            </ChartContainer>
          </Card>

        </div>
      </div>
    );
};

export default Dashboard;