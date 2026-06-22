export interface TraceStep {
  line: number;
  explanation: string;
  state: {
    arr?: number[];
    left?: number;
    right?: number;
    mid?: number;
    target?: number;
    i?: number;
    j?: number;
    k?: number;
    temp?: number;
    sum?: number;
    maxSum?: number;
    windowSum?: number;
    windowStart?: number;
    windowEnd?: number;
    sortedIndices?: number[];
    comparing?: number[];
    swapping?: number[];
    n?: number;
    stack?: string[];
    tree?: { id: string; label: string; status: 'active' | 'resolved' | 'waiting'; value?: number; parentId?: string }[];
    activeNodeId?: string;
    [key: string]: any;
  };
}

export interface AlgorithmPreset {
  id: string;
  name: string;
  category: string;
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
  defaultInputs: Record<string, string>;
  expectedOutput?: string;
  steps: TraceStep[];
}

export const PRESETS: Record<string, AlgorithmPreset> = {
  twoSum: {
    id: 'twoSum',
    name: 'Two Sum',
    category: 'Array Hash Table',
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
    defaultInputs: {
      nums: '[2, 7, 11, 15]',
      target: '9'
    },
    expectedOutput: '[0, 1]',
    code: `function twoSum(nums, target) {
    for (let i = 0; i < nums.length - 1; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) {
                return [i, j]; // Return indices
            }
        }
    }
    return [];
}`,
    steps: []
  },
  binarySearch: {
    id: 'binarySearch',
    name: 'Binary Search',
    category: 'Searching',
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    defaultInputs: {
      arr: '[2, 5, 8, 12, 16, 23, 38, 56, 72, 91]',
      target: '23'
    },
    expectedOutput: '5',
    code: `function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    
    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        
        if (arr[mid] === target) {
            return mid; // Target found
        }
        
        if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}`,
    steps: []
  },
  bubbleSort: {
    id: 'bubbleSort',
    name: 'Bubble Sort',
    category: 'Sorting',
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
    defaultInputs: {
      arr: '[29, 10, 14, 37, 13]'
    },
    expectedOutput: '[10, 13, 14, 29, 37]',
    code: `function bubbleSort(arr) {
    let n = arr.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                // Swap values
                let temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
    return arr;
}`,
    steps: []
  },
  slidingWindow: {
    id: 'slidingWindow',
    name: 'Sliding Window',
    category: 'Subarray Search',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    defaultInputs: {
      arr: '[2, 1, 5, 1, 3, 2]',
      k: '3'
    },
    expectedOutput: '9',
    code: `function maxSubarraySum(arr, k) {
    let maxSum = 0;
    let windowSum = 0;
    
    // Initial window sum
    for (let i = 0; i < k; i++) {
        windowSum += arr[i];
    }
    maxSum = windowSum;
    
    // Slide window
    for (let i = k; i < arr.length; i++) {
        windowSum += arr[i] - arr[i - k];
        maxSum = Math.max(maxSum, windowSum);
    }
    return maxSum;
}`,
    steps: []
  },
  addTwoNumbers: {
    id: 'addTwoNumbers',
    name: 'Add Two Numbers',
    category: 'Linked List',
    timeComplexity: 'O(max(N, M))',
    spaceComplexity: 'O(max(N, M))',
    defaultInputs: {
      l1: '[2, 4, 3]',
      l2: '[5, 6, 4]'
    },
    expectedOutput: '[7, 0, 8]',
    code: `class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0);
        ListNode p = l1, q = l2, curr = dummy;
        int carry = 0;
        
        while (p != null || q != null) {
            int x = (p != null) ? p.val : 0;
            int y = (q != null) ? q.val : 0;
            int sum = carry + x + y;
            carry = sum / 10;
            curr.next = new ListNode(sum % 10);
            curr = curr.next;
            
            if (p != null) p = p.next;
            if (q != null) q = q.next;
        }
        
        if (carry > 0) {
            curr.next = new ListNode(carry);
        }
        
        return dummy.next;
    }
}`,
    steps: []
  }
};
