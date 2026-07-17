using InventoryManagement.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagement.Application.Employees.Commands;

public record BulkDeleteEmployeesCommand(List<Guid> Ids) : IRequest<int>;

public class BulkDeleteEmployeesCommandHandler : IRequestHandler<BulkDeleteEmployeesCommand, int>
{
    private readonly IApplicationDbContext _context;

    public BulkDeleteEmployeesCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(BulkDeleteEmployeesCommand request, CancellationToken cancellationToken)
    {
        var employees = await _context.Employees
            .Where(e => request.Ids.Contains(e.Id))
            .ToListAsync(cancellationToken);

        _context.Employees.RemoveRange(employees);
        await _context.SaveChangesAsync(cancellationToken);

        return employees.Count;
    }
}
