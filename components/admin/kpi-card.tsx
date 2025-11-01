import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, DollarSign, Percent, LogOut, Calendar, AlertCircle } from "lucide-react"

interface KPICardProps {
  title: string
  value: string | number
  icon: "CheckIn" | "CheckOut" | "Occupancy" | "Revenue" | "PendingBookings" | "PendingEvents"
  trend?: string
}

export function KPICard({ title, value, icon, trend }: KPICardProps) {
  const getIcon = () => {
    switch (icon) {
      case "CheckIn":
        return <Users className="w-8 h-8 text-accent" />
      case "CheckOut":
        return <LogOut className="w-8 h-8 text-accent" />
      case "Occupancy":
        return <Percent className="w-8 h-8 text-accent" />
      case "Revenue":
        return <DollarSign className="w-8 h-8 text-accent" />
      case "PendingBookings":
        return <Calendar className="w-8 h-8 text-accent" />
      case "PendingEvents":
        return <AlertCircle className="w-8 h-8 text-accent" />
    }
  }

  const isPositive = trend?.startsWith("+")

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-blue-600" />
              )}
              <span className={isPositive ? "text-green-600" : "text-blue-600"} style={{ fontSize: "0.875rem" }}>
                {trend}
              </span>
            </div>
          )}
        </div>
        <div className="p-3 bg-accent/10 rounded-lg">{getIcon()}</div>
      </div>
    </Card>
  )
}
