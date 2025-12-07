import {
  ListBulletIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@/app/lib/ui";

type Props = {
  readonly todoCount: number;
  readonly inProgressCount: number;
  readonly doneCount: number;
};

export function StatsGrid({ todoCount, inProgressCount, doneCount }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <Card className="bg-background-surface">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-1">
              未着手のTODO
            </p>
            <p className="text-3xl font-bold text-text-primary">{todoCount}</p>
          </div>
          <ListBulletIcon className="h-12 w-12 text-text-tertiary" />
        </div>
      </Card>

      <Card className="bg-background-surface">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-1">
              進行中のTODO
            </p>
            <p className="text-3xl font-bold text-primary-600">
              {inProgressCount}
            </p>
          </div>
          <ClockIcon className="h-12 w-12 text-primary-600" />
        </div>
      </Card>

      <Card className="bg-background-surface">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-1">
              完了したTODO
            </p>
            <p className="text-3xl font-bold text-text-primary">{doneCount}</p>
          </div>
          <CheckCircleIcon className="h-12 w-12 text-text-tertiary" />
        </div>
      </Card>
    </div>
  );
}
