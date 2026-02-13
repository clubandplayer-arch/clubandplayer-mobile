export type OpportunityStatus = string;

export type Opportunity = {
  id: string;
  title?: string | null;
  description?: string | null;
  created_at?: string | null;
  status?: OpportunityStatus | null;
  sport?: string | null;
  role?: string | null;
  category?: string | null;
  required_category?: string | null;
  age_min?: number | null;
  age_max?: number | null;
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  club_name?: string | null;
  club_id?: string | null;
  owner_id?: string | null;
  created_by?: string | null;
  gender?: string | null;
};

export type OpportunityDetail = Opportunity;

export type OpportunitiesListResponse = {
  ok: true;
  data: Opportunity[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  sort: string;
};

export type OpportunityDetailResponse = {
  data: OpportunityDetail;
};

export type FetchOpportunitiesParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  q?: string;
};

export type FetchOpportunitiesResult = {
  data: Opportunity[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  sort: string;
};
