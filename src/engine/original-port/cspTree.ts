// Port trực tiếp ý tưởng từ z-aqib/Floor-Plan-Generator-Using-AI/src/final.py.
// Repo gốc mô tả engine Python CSP Tree: tạo TreeNode, build_room_design,
// check_constraints và duyệt hoán vị để lọc các thứ tự phòng hợp lệ.
export type OriginalRoomName = string;
export type ForbiddenAdjacency = [OriginalRoomName, OriginalRoomName];

export class CspTreeNode {
  room: OriginalRoomName;
  children: CspTreeNode[] = [];
  constructor(room: OriginalRoomName) { this.room = room; }
}

export function addRoomToTree(root: CspTreeNode, room: OriginalRoomName) {
  const node = new CspTreeNode(room);
  root.children.push(node);
  return node;
}

export function buildRoomDesign(root: CspTreeNode, out: OriginalRoomName[] = []) {
  out.push(root.room);
  for (const child of root.children) buildRoomDesign(child, out);
  return out;
}

export const originalForbiddenAdjacency: ForbiddenAdjacency[] = [
  ['Kitchen', 'Master Bedroom (with bathroom)'],
  ['Store', 'Master Bedroom (with bathroom)'],
  ['Bathroom', 'Master Bedroom (with bathroom)'],
  ['Kitchen', 'Guest Room (with bathroom)'],
  ['Store', 'Guest Room (with bathroom)'],
  ['Bathroom', 'Guest Room (with bathroom)'],
];

export function checkConstraints(root: CspTreeNode, constraints: ForbiddenAdjacency[] = originalForbiddenAdjacency) {
  function dfs(node: CspTreeNode, parent: OriginalRoomName | null, counts: {garage: number; balcony: number}): boolean {
    if (node.room === 'Balcony') counts.balcony += 1;
    if (node.room === 'Garage') counts.garage += 1;
    for (const [a, b] of constraints) {
      if ((a === node.room && b === parent) || (b === node.room && a === parent)) return false;
    }
    return node.children.every((child) => dfs(child, node.room, counts));
  }
  const counts = { garage: 0, balcony: 0 };
  if (!dfs(root, null, counts)) return false;
  if (counts.garage > 1 || counts.balcony > 1 || (counts.garage === 1 && counts.balcony === 1)) return false;
  if (counts.garage === 1 && root.room !== 'Garage') return false;
  if (counts.balcony === 1 && root.room !== 'Balcony') return false;
  return true;
}

export function permutations<T>(arr: T[], limit = 50): T[][] {
  const out: T[][] = [];
  const used = new Array(arr.length).fill(false);
  function backtrack(path: T[]) {
    if (out.length >= limit) return;
    if (path.length === arr.length) { out.push([...path]); return; }
    for (let i = 0; i < arr.length; i += 1) if (!used[i]) { used[i] = true; path.push(arr[i]); backtrack(path); path.pop(); used[i] = false; }
  }
  backtrack([]);
  return out;
}

export function rearrangeRooms(root: CspTreeNode, constraints = originalForbiddenAdjacency, limit = 50) {
  return permutations(buildRoomDesign(root), limit * 4).filter((order) => {
    const newRoot = new CspTreeNode(order[0]);
    let cur = newRoot;
    for (const room of order.slice(1)) cur = addRoomToTree(cur, room);
    return checkConstraints(newRoot, constraints);
  }).slice(0, limit);
}

export function generateCspOrders(roomNames: string[], constraints = originalForbiddenAdjacency, limit = 50) {
  if (!roomNames.length) return [];
  const root = new CspTreeNode(roomNames[0]);
  let cur = root;
  for (const room of roomNames.slice(1)) cur = addRoomToTree(cur, room);
  return rearrangeRooms(root, constraints, limit);
}
