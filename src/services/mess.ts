export type Member = {
  id: number;
  name: string;
  role: "manager" | "member";
  balance: number;
  meals: number;
  avatar: string;
};

const members: Member[] = [
  { id: 1, name: "Rahim Doe", role: "manager", balance: 500, meals: 25, avatar: "https://placehold.co/40x40.png" },
  { id: 2, name: "Karim Khan", role: "member", balance: -120, meals: 30, avatar: "https://placehold.co/40x40.png" },
  { id: 3, name: "Jabbar Ali", role: "member", balance: 80, meals: 22, avatar: "https://placehold.co/40x40.png" },
  { id: 4, name: "Salam Sheikh", role: "member", balance: -300, meals: 28, avatar: "https://placehold.co/40x40.png" },
  { id: 5, name: "Farah Ahmed", role: "member", balance: 150, meals: 26, avatar: "https://placehold.co/40x40.png" },
];

export async function getMembers(): Promise<Member[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return members;
}
