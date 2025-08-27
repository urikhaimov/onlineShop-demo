import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SuggestionDTO } from './dto/suggestion.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('suggest')
  async suggest(@Query('q') q = ''): Promise<SuggestionDTO[]> {
    const query = q.trim();
    if (query.length < 2) return [];
    return this.search.suggest(query);
  }
}
