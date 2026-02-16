import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Award, Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function BadgeDisplay({ clientId }) {
  const { data: allBadges } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.Badge.filter({ is_active: true }),
    initialData: [],
  });

  const { data: clientBadges } = useQuery({
    queryKey: ['clientBadges', clientId],
    queryFn: () => base44.entities.ClientBadge.filter({ client_id: clientId }),
    enabled: !!clientId,
    initialData: [],
  });

  const earnedBadgeIds = clientBadges.map(cb => cb.badge_id);
  const earnedBadges = allBadges.filter(b => earnedBadgeIds.includes(b.id));
  const lockedBadges = allBadges.filter(b => !earnedBadgeIds.includes(b.id));

  const rarityColors = {
    common: "bg-gray-100 border-gray-300",
    rare: "bg-blue-100 border-blue-400",
    epic: "bg-purple-100 border-purple-400",
    legendary: "bg-yellow-100 border-yellow-400"
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-600" />
          Badge Collection ({earnedBadges.length}/{allBadges.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Earned Badges */}
          {earnedBadges.map((badge, idx) => {
            const clientBadge = clientBadges.find(cb => cb.badge_id === badge.id);
            return (
              <motion.div
                key={badge.id}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative p-4 border-2 rounded-xl ${rarityColors[badge.rarity]} hover:shadow-lg transition-all cursor-pointer group`}
              >
                {clientBadge?.is_new && (
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-red-500 text-white animate-pulse">NEW!</Badge>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-5xl mb-2">{badge.icon}</div>
                  <p className="font-bold text-sm text-gray-900">{badge.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                  <Badge className="mt-2 text-xs capitalize">{badge.rarity}</Badge>
                  {clientBadge && (
                    <p className="text-xs text-gray-500 mt-1">
                      Earned {new Date(clientBadge.earned_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Locked Badges */}
          {lockedBadges.map(badge => (
            <div
              key={badge.id}
              className="relative p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 opacity-60 hover:opacity-80 transition-all"
            >
              <div className="absolute top-2 right-2">
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-center">
                <div className="text-5xl mb-2 grayscale">{badge.icon}</div>
                <p className="font-bold text-sm text-gray-500">{badge.name}</p>
                <p className="text-xs text-gray-400 mt-1">{badge.unlock_criteria?.description || badge.description}</p>
                <Badge variant="outline" className="mt-2 text-xs">Locked</Badge>
              </div>
            </div>
          ))}
        </div>

        {allBadges.length === 0 && (
          <div className="text-center py-12">
            <Award className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">No badges available yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}