import type { FormQuestion } from '../../../types/workflow.types';

export const getQuestionNumberMap = (questions: FormQuestion[]) => {
  const numberMap = new Map<string, string>();
  const childrenByParentId = new Map<string, FormQuestion[]>();
  const topLevelQuestions: FormQuestion[] = [];

  questions.forEach((question) => {
    const parentId = question.condition?.questionId;
    const hasValidParent = !!parentId && questions.some(q => q.id === parentId);

    if (!hasValidParent || !parentId || parentId === question.id) {
      topLevelQuestions.push(question);
      return;
    }

    const currentChildren = childrenByParentId.get(parentId) || [];
    currentChildren.push(question);
    childrenByParentId.set(parentId, currentChildren);
  });

  const assignNumbers = (currentQuestions: FormQuestion[], parentNumber?: string, chain = new Set<string>()) => {
    currentQuestions.forEach((question, index) => {
      const currentNumber = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;
      numberMap.set(question.id, currentNumber);

      if (chain.has(question.id)) return;

      const children = childrenByParentId.get(question.id) || [];
      assignNumbers(children, currentNumber, new Set([...chain, question.id]));
    });
  };

  assignNumbers(topLevelQuestions);

  questions.forEach((question) => {
    if (!numberMap.has(question.id)) {
      numberMap.set(question.id, `${numberMap.size + 1}`);
    }
  });

  return numberMap;
};

export interface QuestionNode {
  question: FormQuestion;
  children: QuestionNode[];
}

export const buildQuestionTree = (questions: FormQuestion[]): QuestionNode[] => {
  const nodesMap = new Map<string, QuestionNode>();
  questions.forEach(q => {
    nodesMap.set(q.id, { question: q, children: [] });
  });

  const roots: QuestionNode[] = [];
  questions.forEach(q => {
    const node = nodesMap.get(q.id)!;
    const parentId = q.condition?.questionId;
    const hasValidParent = !!parentId && questions.some(pq => pq.id === parentId);

    if (!hasValidParent || !parentId || parentId === q.id) {
      roots.push(node);
    } else {
      const parentNode = nodesMap.get(parentId);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });

  return roots;
};

export const findNodeAndParentList = (
  nodes: QuestionNode[],
  targetId: string
): { list: QuestionNode[]; index: number; parentNode: QuestionNode | null } | null => {
  const idx = nodes.findIndex(n => n.question.id === targetId);
  if (idx !== -1) {
    return { list: nodes, index: idx, parentNode: null };
  }
  for (const node of nodes) {
    const result = findNodeAndParentList(node.children, targetId);
    if (result) {
      if (result.parentNode === null) {
        result.parentNode = node;
      }
      return result;
    }
  }
  return null;
};

export const flattenQuestionTree = (nodes: QuestionNode[]): FormQuestion[] => {
  const flat: FormQuestion[] = [];
  const traverse = (node: QuestionNode) => {
    flat.push(node.question);
    node.children.forEach(traverse);
  };
  nodes.forEach(traverse);
  return flat;
};

export const sortQuestionsHierarchically = (questions: FormQuestion[]): FormQuestion[] => {
  const tree = buildQuestionTree(questions);
  const flat = flattenQuestionTree(tree);
  const numberMap = getQuestionNumberMap(flat);
  return flat.map(q => ({
    ...q,
    displayNumber: numberMap.get(q.id)
  }));
};
