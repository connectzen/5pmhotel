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
    <Card className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-accent/50 bg-gradient-to-br from-card to-card/95 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-2 font-medium">{title}</p>
          <p className="text-3xl font-bold text-foreground mb-1 group-hover:text-accent transition-colors">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-blue-500" />
              )}
              <span className={isPositive ? "text-green-500 font-semibold" : "text-blue-500 font-semibold"} style={{ fontSize: "0.875rem" }}>
                {trend}
              </span>
            </div>
          )}
        </div>
        <div className="p-4 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl group-hover:from-accent/30 group-hover:to-accent/20 transition-all shadow-sm">
          <div className="group-hover:scale-110 transition-transform duration-300">
            {getIcon()}
          </div>
        </div>
      </div>
    </Card>
  )
}
