using InventoryManagement.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InventoryManagement.Application.Categories.Commands;

public record BulkDeleteCategoriesCommand(List<Guid> Ids) : IRequest<int>;

public class BulkDeleteCategoriesCommandHandler : IRequestHandler<BulkDeleteCategoriesCommand, int>
{
    private readonly IApplicationDbContext _context;

    public BulkDeleteCategoriesCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(BulkDeleteCategoriesCommand request, CancellationToken cancellationToken)
    {
        var categories = await _context.Categories
            .Where(c => request.Ids.Contains(c.Id))
            .ToListAsync(cancellationToken);

        var hasProducts = await _context.Products.AnyAsync(p => request.Ids.Contains(p.CategoryId), cancellationToken);
        if (hasProducts)
            throw new InvalidOperationException("Cannot delete categories with associated products.");

        _context.Categories.RemoveRange(categories);
        await _context.SaveChangesAsync(cancellationToken);

        return categories.Count;
    }
}
