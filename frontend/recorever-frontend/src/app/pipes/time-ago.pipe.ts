import { Pipe, PipeTransform } from '@angular/core';
import { formatDistanceToNow, format, differenceInHours } from 'date-fns';

@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {

  transform(value: string | Date | null | undefined): string {
    if (!value) return '';

    try {
      const date = new Date(value); 
      const now = new Date();

      if (isNaN(date.getTime())) return 'Invalid date';

      const hoursDiff = Math.abs(differenceInHours(now, date));

      if (hoursDiff >= 24) {
        return format(date, 'MMM d, yyyy');
      }

      return formatDistanceToNow(date, { addSuffix: true });
      
    } catch (e: unknown) {
      return 'Invalid date';
    }
  }
}