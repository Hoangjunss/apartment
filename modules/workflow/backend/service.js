import { prisma } from '@my/prisma';

// Lấy chi tiết Workflow theo tên (kèm theo Steps và Transitions)
export const getWorkflowByName = async (name) => {
  return prisma.workflows.findUnique({
    where: { name },
    include: {
      steps: {
        orderBy: { order_number: 'asc' }
      },
      transitions: {
        include: {
          from_step: true,
          to_step: true
        }
      }
    }
  });
};

// Lấy các transition hợp lệ từ một step hiện tại
export const getAvailableTransitions = async (workflowName, currentStepName, userRole) => {
  const workflow = await prisma.workflows.findUnique({
    where: { name: workflowName },
    include: {
      steps: true,
      transitions: {
        include: {
          from_step: true,
          to_step: true
        }
      }
    }
  });

  if (!workflow) return [];

  // Lọc transitions bắt nguồn từ step hiện tại
  let transitions = workflow.transitions.filter(t => t.from_step.step_name === currentStepName);

  // Lọc theo phân quyền vai trò (role)
  if (userRole && userRole !== 'ADMIN') { // ADMIN bypass kiểm tra phân quyền vai trò trên transition
    transitions = transitions.filter(t => {
      if (!t.role_allowed) return true; // Rỗng là cho phép tất cả
      const allowedRoles = t.role_allowed.split(',').map(r => r.trim());
      return allowedRoles.includes(userRole);
    });
  }

  return transitions;
};

// Xác thực xem một transition từ fromStep sang toStep có hợp lệ hay không
export const validateTransition = async (workflowName, fromStepName, toStepName, userRole) => {
  // Lấy các transitions khả dụng cho vai trò này tại trạng thái hiện tại
  const available = await getAvailableTransitions(workflowName, fromStepName, userRole);
  const isValid = available.some(t => t.to_step.step_name === toStepName);
  
  if (!isValid) {
    throw new Error(`Chuyển đổi trạng thái từ "${fromStepName}" sang "${toStepName}" không hợp lệ đối với quy trình "${workflowName}" hoặc bạn không đủ quyền thực hiện.`);
  }

  return true;
};

// CRUD API cho Workflow
export const getAllWorkflows = async () => {
  return prisma.workflows.findMany({
    include: {
      steps: { orderBy: { order_number: 'asc' } },
      transitions: {
        include: {
          from_step: true,
          to_step: true
        }
      }
    }
  });
};

export const createWorkflow = async (data) => {
  return prisma.workflows.create({ data });
};

export const createStep = async (workflowId, data) => {
  return prisma.workflowSteps.create({
    data: {
      workflow_id: Number(workflowId),
      step_name: data.step_name,
      order_number: Number(data.order_number),
      is_initial: !!data.is_initial,
      is_final: !!data.is_final
    }
  });
};

export const createTransition = async (workflowId, data) => {
  return prisma.workflowTransitions.create({
    data: {
      workflow_id: Number(workflowId),
      from_step_id: Number(data.from_step_id),
      to_step_id: Number(data.to_step_id),
      name: data.name,
      role_allowed: data.role_allowed || null
    }
  });
};
