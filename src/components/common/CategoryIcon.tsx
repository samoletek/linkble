import React from 'react';
import {
  SoccerBall,
  Wine,
  Briefcase,
  Coffee,
  GraduationCap,
  MusicNotes,
  LockSimple,
  IconProps,
} from 'phosphor-react-native';

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  sports_hobbies: SoccerBall,
  parties: Wine,
  business: Briefcase,
  free_time: Coffee,
  studies: GraduationCap,
  concerts: MusicNotes,
  private_events: LockSimple,
};

interface CategoryIconProps {
  categoryName: string;
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}

export default function CategoryIcon({
  categoryName,
  size = 20,
  color = '#FFFFFF',
  weight = 'bold',
}: CategoryIconProps) {
  const IconComponent = CATEGORY_ICON_MAP[categoryName] || SoccerBall;
  return <IconComponent size={size} color={color} weight={weight} />;
}
