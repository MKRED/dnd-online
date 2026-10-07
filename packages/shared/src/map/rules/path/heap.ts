// Двоичная куча по приоритету (меньше — раньше) для поиска пути. При равном
// приоритете раньше идёт меньший tie — второй ключ сравнения.
// Уменьшения приоритета нет: позицию кладут повторно, лишнее отсеивает поиск.
export class MinHeap<T> {
  private readonly items: { value: T; priority: number; tie: number }[] = [];

  get size(): number {
    return this.items.length;
  }

  private less(a: number, b: number): boolean {
    const x = this.items[a];
    const y = this.items[b];
    return (
      x.priority < y.priority || (x.priority === y.priority && x.tie < y.tie)
    );
  }

  push(value: T, priority: number, tie = 0): void {
    const items = this.items;
    items.push({ value, priority, tie });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(i, parent)) break;
      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }

  pop(): T | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0 && last) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < items.length && this.less(left, smallest)) smallest = left;
        if (right < items.length && this.less(right, smallest))
          smallest = right;
        if (smallest === i) break;
        [items[i], items[smallest]] = [items[smallest], items[i]];
        i = smallest;
      }
    }
    return top?.value;
  }
}
