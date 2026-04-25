import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import type { UmuravaProfile } from "../../types";

export const ProfilePreviewCard = ({ profile }: { profile: Partial<UmuravaProfile> }) => (
  <Card className="space-y-2">
    <h4 className="font-semibold">{profile.firstName} {profile.lastName}</h4>
    <p className="text-sm text-slate-600">{profile.title}</p>
    <div className="flex flex-wrap gap-2">{profile.skills?.slice(0, 8).map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
  </Card>
);
