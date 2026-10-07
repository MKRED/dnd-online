// Двоичная куча по приоритету (меньше — раньше) для поиска пути.
// Уменьшения приоритета нет: позицию кладут повторно, лишнее отсеивает поиск.
export class MinHeap<T> {
  private readonly items: { value: T; priority: number }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(value: T, priority: number): void {
    const items = this.items;
    items.push({ value, priority });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent].priority <= priority) break;
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
        if (
          left < items.length &&
          items[left].priority < items[smallest].priority
        )
          smallest = left;
        if (
          right < items.length &&
          items[right].priority < items[smallest].priority
        )
          smallest = right;
        if (smallest === i) break;
        [items[i], items[smallest]] = [items[smallest], items[i]];
        i = smallest;
      }
    }
    return top?.value;
  }
}
