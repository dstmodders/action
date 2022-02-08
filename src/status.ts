export type StatusType =
  | 'unknown'
  | 'in-progress'
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'skipped';

export interface Status {
  title: string;
  color: string;
}

const status: Record<StatusType, Status> = {
  unknown: {
    title: 'Unknown',
    color: '#1f242b',
  },
  'in-progress': {
    title: 'In Progress',
    color: '#dcad04',
  },
  success: {
    title: 'Success',
    color: '#24a943',
  },
  failure: {
    title: 'Failure',
    color: '#cc1f2d',
  },
  cancelled: {
    title: 'Cancelled',
    color: '#1f242b',
  },
  skipped: {
    title: 'Skipped',
    color: '#1f242b',
  },
} as const;

export default status;
